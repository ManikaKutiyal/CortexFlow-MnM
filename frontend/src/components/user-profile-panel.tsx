"use client";
import React, { useState, useEffect } from "react";
import { User, Camera, MapPin, Phone, Mail, Building, Briefcase, AlertCircle, Save } from "lucide-react";
import { getSupabaseBrowserClient } from "@/libs/supabase-browser";
import dynamic from "next/dynamic";

// Removed unused map imports to avoid crashing if not installed

interface UserProfilePanelProps {
  currentUserRole: string;
  currentUserId: string;
}

// Trigger re-parse for TS server
export function UserProfilePanel({ currentUserRole, currentUserId }: UserProfilePanelProps) {
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>({
    display_name: "",
    username: "",
    mobile_number: "",
    address: "",
    latitude: 0,
    longitude: 0,
    additional_photos: [],
  });
  const [email, setEmail] = useState("");
  const [vulnerabilities, setVulnerabilities] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [orgName, setOrgName] = useState("");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string>("");

  useEffect(() => {
    fetchProfile();
  }, [currentUserId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: userAuth, error: authError } = await supabase.auth.getUser();
      if (userAuth?.user) {
        setEmail(userAuth.user.email || "");
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUserId)
        .single();
      
      const { data: userProfileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", currentUserId)
        .maybeSingle();
      
      const user = userData as any;
      const userProfile = userProfileData as any || {};
      if (user) {
        setProfileData({
          display_name: user.display_name || "",
          username: user.username || "",
          mobile_number: user.phone || "",
          address: userProfile.address || "",
          latitude: userProfile.latitude || 0,
          longitude: userProfile.longitude || 0,
          additional_photos: userProfile.additional_photos || [],
        });
        setProfilePicUrl(user.photo_url || "");
      }

      if (currentUserRole === "patient") {
        const { data: pData } = await supabase
          .from("patient_profiles")
          .select("vulnerabilities")
          .eq("user_id", currentUserId)
          .single();
        const patientData = pData as any;
        if (patientData) setVulnerabilities(patientData.vulnerabilities || "");
      } else if (currentUserRole === "provider") {
        const { data: pData } = await supabase
          .from("provider_profiles")
          .select("specialty, org_name")
          .eq("user_id", currentUserId)
          .single();
        const providerData = pData as any;
        if (providerData) {
          setSpecialty(providerData.specialty || "");
          setOrgName(providerData.org_name || "");
        }
      }

    } catch (err) {
      console.error("Error fetching profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalAvatarUrl = profilePicUrl;

      if (profilePic) {
        const fileExt = profilePic.name.split(".").pop();
        const fileName = `${currentUserId}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-pics")
          .upload(fileName, profilePic, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from("profile-pics").getPublicUrl(fileName);
          finalAvatarUrl = data.publicUrl;
          setProfilePicUrl(finalAvatarUrl);
        }
      }

      const { error: userError } = await (supabase.from("users") as any).update({
          display_name: profileData.display_name,
          username: profileData.username,
          phone: profileData.mobile_number,
          photo_url: finalAvatarUrl,
        })
        .eq("id", currentUserId);

      if (userError) throw userError;

      const { error: profileError } = await (supabase.from("user_profiles") as any).upsert({
          user_id: currentUserId,
          address: profileData.address,
          latitude: profileData.latitude,
          longitude: profileData.longitude,
          updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      if (currentUserRole === "patient") {
        await (supabase.from("patient_profiles") as any)
          .update({ vulnerabilities })
          .eq("user_id", currentUserId);
      } else if (currentUserRole === "provider") {
        await (supabase.from("provider_profiles") as any)
          .update({ specialty, org_name: orgName })
          .eq("user_id", currentUserId);
      }
      
      alert("Profile updated successfully!");

    } catch (err) {
      console.error("Error saving profile", err);
      alert("Error saving profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-[var(--nt-text-ghost)] animate-pulse">Loading profile...</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-4xl mx-auto rounded-2xl p-6 sm:p-8" style={{ background: "var(--nt-glass)", border: "1px solid var(--nt-glass-border)", boxShadow: "var(--nt-glass-shadow)" }}>
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne)" }}>
          <User className="text-teal-500" />
          My Profile
        </h1>

        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-dashed" style={{ borderColor: "var(--nt-divider)" }}>
              {profilePicUrl ? (
                <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" onError={() => setProfilePicUrl("")} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/10">
                  <User size={48} style={{ color: "var(--nt-text-ghost)" }} />
                </div>
              )}
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 hover:opacity-100 cursor-pointer transition-opacity text-white text-xs font-medium">
                <Camera size={20} className="mb-1" />
                Change
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      if (e.target.files[0].size > 1024 * 1024) {
                        alert("File must be less than 1MB");
                        return;
                      }
                      setProfilePic(e.target.files[0]);
                      setProfilePicUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }} 
                />
              </label>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--nt-text-ghost)" }}>Display Name</label>
              <input 
                type="text" 
                value={profileData.display_name} 
                onChange={(e) => setProfileData({...profileData, display_name: e.target.value})}
                className="px-3 py-2 rounded-lg outline-none text-sm" 
                style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--nt-text-ghost)" }}>Username (Unique)</label>
              <input 
                type="text" 
                value={profileData.username} 
                onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                className="px-3 py-2 rounded-lg outline-none text-sm" 
                style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--nt-text-ghost)" }}><Mail size={12} /> Email ID</label>
              <input 
                type="email" 
                value={email} 
                readOnly
                className="px-3 py-2 rounded-lg outline-none text-sm opacity-60 cursor-not-allowed" 
                style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--nt-text-ghost)" }}><Phone size={12} /> Mobile Number</label>
              <input 
                type="tel" 
                value={profileData.mobile_number} 
                onChange={(e) => setProfileData({...profileData, mobile_number: e.target.value})}
                className="px-3 py-2 rounded-lg outline-none text-sm" 
                style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mb-8" style={{ borderColor: "var(--nt-divider)" }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne)" }}>Location & Details</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--nt-text-ghost)" }}><MapPin size={12} /> Address</label>
              <textarea 
                value={profileData.address} 
                onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                rows={2}
                className="px-3 py-2 rounded-lg outline-none text-sm resize-none" 
                style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
              />
            </div>
            
            {currentUserRole === "patient" && (
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-rose-500"><AlertCircle size={12} /> Vulnerabilities (Patient Only)</label>
                <textarea 
                  value={vulnerabilities} 
                  onChange={(e) => setVulnerabilities(e.target.value)}
                  rows={3}
                  className="px-3 py-2 rounded-lg outline-none text-sm resize-none" 
                  style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
                  placeholder="E.g., mobility issues, severe allergies..."
                />
              </div>
            )}

            {currentUserRole === "provider" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--nt-text-ghost)" }}><Briefcase size={12} /> Specialty</label>
                  <input 
                    type="text" 
                    value={specialty} 
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="px-3 py-2 rounded-lg outline-none text-sm" 
                    style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--nt-text-ghost)" }}><Building size={12} /> Organization Name</label>
                  <input 
                    type="text" 
                    value={orgName} 
                    onChange={(e) => setOrgName(e.target.value)}
                    className="px-3 py-2 rounded-lg outline-none text-sm" 
                    style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t" style={{ borderColor: "var(--nt-divider)" }}>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors text-white"
            style={{ background: saving ? "#666" : "#14b8a6" }}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
