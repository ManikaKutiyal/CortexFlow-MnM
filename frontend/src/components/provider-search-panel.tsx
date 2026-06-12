"use client";
import React, { useState, useEffect } from "react";
import { Search, MapPin, Star, Building, Briefcase, User, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ProviderSearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    setQuery("");
    // trigger empty search to get all
    const fetchAll = async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await fetch(`/api/search?q=`);
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  };

  return (
    <div className="rounded-2xl p-4 sm:p-5 animate-fade-up" style={{ background: "var(--nt-glass)", border: "1px solid var(--nt-glass-border)", boxShadow: "var(--nt-glass-shadow)" }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 style={{ color: "var(--nt-text-hi)", fontSize: 16, fontFamily: "var(--font-syne)", fontWeight: 600 }}>Find Providers & Hospitals</h2>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11, fontFamily: "var(--font-dm-sans)", marginTop: 2 }}>Search our network of verified specialists and caregivers.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-1 max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--nt-text-ghost)" }} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl outline-none text-sm"
              style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors text-white whitespace-nowrap"
            style={{ background: "#14b8a6", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {!searched ? (
        <div className="flex items-center gap-4 py-2">
          <button onClick={handleViewAll} className="text-xs font-semibold underline" style={{ color: "#14b8a6" }}>
            View all registered hospitals and caretakers
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: "var(--nt-text-hi)", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Search Results</span>
            <button onClick={() => { setSearched(false); setResults([]); }} className="text-[10px] underline" style={{ color: "var(--nt-text-ghost)" }}>Clear</button>
          </div>
          
          {results.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: "var(--nt-text-ghost)" }}>No providers found matching your search.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((provider) => (
                <div key={provider.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0" style={{ border: "1px solid var(--nt-divider)" }}>
                    {provider.avatar_url ? (
                      <img src={provider.avatar_url} alt={provider.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black/10">
                        <User size={20} style={{ color: "var(--nt-text-ghost)" }} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: "var(--nt-text-hi)" }}>{provider.display_name}</span>
                      {provider.rating && (
                        <div className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "#f59e0b" }}>
                          <Star size={10} className="fill-amber-500" />
                          {provider.rating}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--nt-text-lo)" }}>
                      {provider.specialty ? provider.specialty : provider.role === "caregiver" ? "Caregiver" : "Healthcare Provider"}
                      {provider.org_name && ` • ${provider.org_name}`}
                    </div>
                    
                    {provider.address && (
                      <div className="text-[9px] truncate mt-1 flex items-center gap-1" style={{ color: "var(--nt-text-ghost)" }}>
                        <MapPin size={9} /> {provider.address}
                      </div>
                    )}
                  </div>
                  
                  <Link href={`/profile/${provider.id}`} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: "rgba(20,184,166,0.1)", color: "#14b8a6" }}>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
