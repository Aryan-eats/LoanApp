-- Make lead client_email nullable for optional-consent intake flows
ALTER TABLE "leads"
  ALTER COLUMN "client_email" DROP NOT NULL;
