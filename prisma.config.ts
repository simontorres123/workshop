import { defineConfig } from "prisma/config"

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres.ucmsdqyfnhcckpbtvjey:YXyPS5wekhTryPhV@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
  },
})
