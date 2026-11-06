-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "quincenalRate" REAL NOT NULL DEFAULT 0.1,
    "monthlyRate" REAL NOT NULL DEFAULT 0.2,
    "periodsPerLoan" INTEGER NOT NULL DEFAULT 36,
    "maxLoans" INTEGER NOT NULL DEFAULT 200,
    "maxPayments" INTEGER NOT NULL DEFAULT 2000,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerName" TEXT NOT NULL,
    "loanDate" DATETIME NOT NULL,
    "principal" REAL NOT NULL,
    "modality" TEXT NOT NULL,
    "ratePerPeriod" REAL NOT NULL,
    "interestPerPeriod" REAL NOT NULL,
    "firstInterestPaymentDate" DATETIME,
    "capitalPaid" REAL NOT NULL DEFAULT 0,
    "capitalPending" REAL NOT NULL DEFAULT 0,
    "interestReceived" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "nextCollection" DATETIME,
    "interestOverdue" REAL NOT NULL DEFAULT 0,
    "daysOverdue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" INTEGER,
    CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loanId" INTEGER NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "periodNumber" INTEGER,
    "note" TEXT,
    "customerName" TEXT NOT NULL,
    "review" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" INTEGER,
    CONSTRAINT "Payment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Period" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loanId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "dueDate" DATETIME,
    "modality" TEXT NOT NULL,
    "capitalPendingEstimated" REAL NOT NULL,
    "interestGenerated" REAL NOT NULL,
    "interestPaid" REAL NOT NULL DEFAULT 0,
    "interestPending" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Period_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
