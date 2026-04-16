-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrCode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "logoFileUrl" TEXT,
    "qrPngUrl" TEXT,
    "qrSvgUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrRedirectVersion" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "changeNote" TEXT,

    CONSTRAINT "QrRedirectVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrScanLog" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "redirectVersionId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "referer" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "QrScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_slug_key" ON "QrCode"("slug");

-- AddForeignKey
ALTER TABLE "QrRedirectVersion" ADD CONSTRAINT "QrRedirectVersion_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_redirectVersionId_fkey" FOREIGN KEY ("redirectVersionId") REFERENCES "QrRedirectVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
