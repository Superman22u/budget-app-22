-- CreateTable
CREATE TABLE `import_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filename` VARCHAR(191) NOT NULL,
    `sourceKind` ENUM('ubs', 'swisscard', 'viseca', 'liberty', 'unknown') NOT NULL,
    `fileSha256` VARCHAR(191) NOT NULL,
    `headerJson` JSON NULL,
    `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `insertedCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `errorCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `import_files_fileSha256_key`(`fileSha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `parentId` INTEGER NULL,
    `color` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `categories_name_key`(`name`),
    UNIQUE INDEX `categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matchType` ENUM('contains', 'regex') NOT NULL,
    `pattern` VARCHAR(191) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `categoryId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sourceId` INTEGER NOT NULL,
    `bookingDate` DATE NOT NULL,
    `valueDate` DATE NULL,
    `currency` VARCHAR(8) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `amountChf` DECIMAL(14, 2) NULL,
    `direction` ENUM('debit', 'credit') NOT NULL,
    `description` TEXT NOT NULL,
    `merchant` TEXT NULL,
    `cardLabel` VARCHAR(128) NULL,
    `accountLabel` VARCHAR(512) NULL,
    `externalId` VARCHAR(128) NULL,
    `fingerprint` VARCHAR(191) NOT NULL,
    `categoryId` INTEGER NULL,
    `categoryLocked` BOOLEAN NOT NULL DEFAULT false,
    `rawJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transactions_fingerprint_key`(`fingerprint`),
    INDEX `transactions_bookingDate_idx`(`bookingDate`),
    INDEX `transactions_sourceId_idx`(`sourceId`),
    INDEX `transactions_categoryId_idx`(`categoryId`),
    INDEX `transactions_externalId_idx`(`externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_rules` ADD CONSTRAINT `category_rules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `import_files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
