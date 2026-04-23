import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rbac";

export async function GET(request: Request) {
  const rateLimitResult = rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  return NextResponse.json({
    message: "ARWA LOGISTICS API",
    version: "2.0.0",
    status: "operational",
    endpoints: {
      auth: "/api/auth",
      shipments: "/api/shipments",
      tracking: "/api/tracking",
      warehouses: "/api/warehouses",
      routes: "/api/routes",
      countries: "/api/countries",
      admin: "/api/admin",
      calculator: "/api/calculate-rate",
    },
  });
}