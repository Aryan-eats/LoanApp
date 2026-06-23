-- Add docs_collected and bank_logged to LeadStatus enum
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'docs_collected' AFTER 'docs_uploaded';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'bank_logged' AFTER 'bank_processing';
