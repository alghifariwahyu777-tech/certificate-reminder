import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { certificateSchema } from "@/lib/validations";
import { normalizeCertificatePayload } from "@/lib/certificate-payload";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const categoryId = searchParams.get("categoryId") || "";
  const clientId = searchParams.get("clientId") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const status = searchParams.get("status") || ""; // ACTIVE | EXPIRING_SOON | EXPIRED
  const year = searchParams.get("year") || "";
  const sortBy = searchParams.get("sortBy") || "expiryDate";
  const sortDir = (searchParams.get("sortDir") || "asc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

  const where: Prisma.CertificateWhereInput = { deletedAt: null };

  if (search) {
    where.OR = [
      { certificateName: { contains: search } },
      { certificateNumber: { contains: search } },
      { pic: { contains: search } },
      { client: { name: { contains: search } } },
    ];
  }

  if (categoryId) where.categoryId = categoryId;
  if (clientId) where.clientId = clientId;
  if (departmentId) where.departmentId = departmentId;

  if (year) {
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);
    where.expiryDate = { gte: start, lte: end };
  }

  // Status is computed, not stored — translate to date ranges.
  if (status) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    if (status === "EXPIRED") {
      where.expiryDate = { ...where.expiryDate as object, lt: today };
    } else if (status === "EXPIRING_SOON") {
      where.expiryDate = { ...where.expiryDate as object, gte: today, lte: in30 };
    } else if (status === "ACTIVE") {
      where.expiryDate = { ...where.expiryDate as object, gt: in30 };
    }
  }

  const validSortFields = ["certificateName", "certificateNumber", "expiryDate", "issueDate"];
  const orderBy: Prisma.CertificateOrderByWithRelationInput = validSortFields.includes(sortBy)
    ? { [sortBy]: sortDir }
    : { expiryDate: "asc" };

  const [total, certificates] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true, client: true, department: true },
    }),
  ]);

  return NextResponse.json({
    certificates,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = certificateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // certificateNumber is globally unique at the DB level, including
  // soft-deleted rows — so this also catches numbers still held by a
  // certificate sitting in Trash, and tells the admin that explicitly
  // instead of surfacing a raw database constraint error.
  const duplicate = await prisma.certificate.findUnique({
    where: { certificateNumber: parsed.data.certificateNumber },
  });
  if (duplicate) {
    const message = duplicate.deletedAt
      ? "Nomor sertifikat ini sudah dipakai oleh sertifikat yang ada di Trash. Pulihkan atau hapus permanen sertifikat itu dulu."
      : "Nomor sertifikat sudah digunakan.";
    return NextResponse.json({ message }, { status: 409 });
  }

  const certificate = await prisma.certificate.create({
    data: normalizeCertificatePayload(parsed.data),
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Certificate",
    entityId: certificate.id,
    description: `Menambahkan sertifikat "${certificate.certificateName}" (${certificate.certificateNumber}).`,
  });

  return NextResponse.json({ certificate }, { status: 201 });
}
