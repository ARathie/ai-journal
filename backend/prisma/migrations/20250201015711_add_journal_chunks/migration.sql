-- CreateTable
CREATE TABLE "journal_chunks" (
    "chunk_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "start_offset" INTEGER NOT NULL,
    "end_offset" INTEGER NOT NULL,
    "snippet" TEXT,
    "chunk_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_chunks_pkey" PRIMARY KEY ("chunk_id")
);

-- AddForeignKey
ALTER TABLE "journal_chunks" ADD CONSTRAINT "journal_chunks_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
