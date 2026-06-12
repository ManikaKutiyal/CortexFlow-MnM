import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    
    // Perform search on providers and caregivers
    // Since we don't have a direct full-text search RPC configured here,
    // we'll use ilike for simple fuzzy matching on display_name or org_name
    
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, display_name, avatar_url, address, role")
      .in("role", ["provider", "caregiver"])
      .ilike("display_name", `%${query}%`)
      .limit(20);

    if (usersError) {
      console.error("Search Error:", usersError);
      return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
    }

    // Now let's get the ratings for these users
    // In a real app with pg_trgm and a complex view, this would be one query.
    // Here we'll fetch reviews for the found users.
    const userIds = users?.map(u => u.id) || [];
    
    const { data: reviews } = await supabase
      .from("reviews")
      .select("reviewee_id, rating")
      .in("reviewee_id", userIds);

    // Get provider specifics
    const providerIds = users?.filter(u => u.role === "provider").map(u => u.id) || [];
    let providerProfiles: any[] = [];
    if (providerIds.length > 0) {
      const { data: pData } = await supabase
        .from("provider_profiles")
        .select("id, specialty, org_name")
        .in("id", providerIds);
      if (pData) providerProfiles = pData;
    }

    const results = users?.map(u => {
      const userReviews = reviews?.filter(r => r.reviewee_id === u.id) || [];
      const avgRating = userReviews.length 
        ? (userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length).toFixed(1) 
        : null;
      
      const pProfile = providerProfiles.find(p => p.id === u.id);

      return {
        ...u,
        rating: avgRating,
        reviewCount: userReviews.length,
        specialty: pProfile?.specialty,
        org_name: pProfile?.org_name,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("API Search Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
