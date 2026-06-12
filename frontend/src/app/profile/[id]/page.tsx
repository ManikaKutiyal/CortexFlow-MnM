"use client";
import React, { useState, useEffect } from "react";
import { User, MapPin, Phone, Mail, Building, Briefcase, Star, ArrowLeft } from "lucide-react";
import { getSupabaseBrowserClient } from "@/libs/supabase-browser";
import { useParams, useRouter } from "next/navigation";

export default function PublicProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchProfile(id as string);
  }, [id]);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error: userError } = await supabase
        .from("users")
        .select("display_name, avatar_url, additional_photos, address")
        .eq("id", userId)
        .single();
      
      const user = data as any;
      if (user) {
        // Also try to get provider info if it exists
        const { data: providerInfoData } = await supabase
          .from("provider_profiles")
          .select("specialty, org_name")
          .eq("id", userId)
          .single();
        
        const providerInfo = providerInfoData as any;
          
        setProfileData({
          ...user,
          specialty: providerInfo?.specialty,
          org_name: providerInfo?.org_name,
        });
      }

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewee_id", userId);
        
      if (reviewData) setReviews(reviewData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--nt-text-ghost)" }}>Loading...</div>;
  if (!profileData) return <div className="p-8 text-center text-rose-500">Profile not found.</div>;

  const averageRating = reviews.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "No ratings yet";

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: "var(--nt-bg)" }}>
      <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-10" style={{ background: "var(--nt-glass)", border: "1px solid var(--nt-glass-border)", boxShadow: "var(--nt-glass-shadow)" }}>
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm transition-opacity hover:opacity-70" style={{ color: "var(--nt-text-lo)" }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 shrink-0" style={{ borderColor: "var(--nt-glass-border)" }}>
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/10">
                <User size={48} style={{ color: "var(--nt-text-ghost)" }} />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne)" }}>
              {profileData.display_name || "Anonymous User"}
            </h1>
            
            {profileData.specialty && (
              <div className="flex items-center gap-2 mb-1" style={{ color: "var(--nt-text-md)" }}>
                <Briefcase size={14} />
                <span>{profileData.specialty}</span>
              </div>
            )}
            
            {profileData.org_name && (
              <div className="flex items-center gap-2 mb-4" style={{ color: "var(--nt-text-md)" }}>
                <Building size={14} />
                <span>{profileData.org_name}</span>
              </div>
            )}
            
            {profileData.address && (
              <div className="flex items-center gap-2 mb-4" style={{ color: "var(--nt-text-md)" }}>
                <MapPin size={14} />
                <span>{profileData.address}</span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <span className="font-semibold text-amber-500">{averageRating}</span>
              <span className="text-xs" style={{ color: "var(--nt-text-ghost)" }}>({reviews.length} reviews)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
