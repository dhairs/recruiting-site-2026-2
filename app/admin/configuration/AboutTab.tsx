"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AboutPageConfig, AboutSection } from "@/lib/models/Config";
import { Save, Plus, Trash2, Edit2, X, GripVertical } from "lucide-react";

export function AboutTab() {
  const [config, setConfig] = useState<AboutPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editing states
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingMission, setEditingMission] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  // Draft values
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSubtitle, setDraftSubtitle] = useState("");
  const [draftMission, setDraftMission] = useState("");
  const [draftSection, setDraftSection] = useState<Partial<AboutSection>>({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config/about");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error("Failed to fetch about config", err);
      toast.error("Failed to load about page configuration");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updates: Partial<AboutPageConfig>) => {
    if (!config) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, ...updates }),
      });

      if (res.ok) {
        toast.success("About page updated!");
        setConfig({ ...config, ...updates } as AboutPageConfig);
        setEditingTitle(false);
        setEditingMission(false);
        setEditingSection(null);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save");
      }
    } catch (err) {
      console.error("Failed to save config", err);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEditTitle = () => {
    setDraftTitle(config?.title || "");
    setDraftSubtitle(config?.subtitle || "");
    setEditingTitle(true);
  };

  const startEditMission = () => {
    setDraftMission(config?.missionStatement || "");
    setEditingMission(true);
  };

  const startEditSection = (section: AboutSection) => {
    setDraftSection({ ...section });
    setEditingSection(section.id);
  };

  const addSection = () => {
    const newSection: AboutSection = {
      id: `section_${Date.now()}`,
      title: "New Section",
      content: "Section content here...",
      order: (config?.sections?.length || 0) + 1,
    };
    const newSections = [...(config?.sections || []), newSection];
    saveConfig({ sections: newSections });
  };

  const deleteSection = (id: string) => {
    if (!confirm("Delete this section?")) return;
    const newSections = (config?.sections || []).filter(s => s.id !== id);
    saveConfig({ sections: newSections });
  };

  const saveSectionEdit = () => {
    if (!editingSection || !draftSection.id) return;
    const newSections = (config?.sections || []).map(s => 
      s.id === draftSection.id ? { ...s, ...draftSection } as AboutSection : s
    );
    saveConfig({ sections: newSections });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-neutral-500 h-full">
        <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mr-3"></div>
        Loading about page configuration...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">About Page</h2>
          <p className="text-neutral-400">
            Manage the public About page content. Only administrators can edit this.
          </p>
          <p className="text-xs text-amber-500/80 mt-2">
            ⏱ Note: Changes may take up to 15 minutes to appear on the public page due to caching.
          </p>
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Title & Subtitle</h3>
          {!editingTitle && (
            <button onClick={startEditTitle} className="text-orange-500 text-sm flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
        
        {editingTitle ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Title</label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-4 py-3 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Subtitle</label>
              <input
                type="text"
                value={draftSubtitle}
                onChange={(e) => setDraftSubtitle(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-4 py-3 text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveConfig({ title: draftTitle, subtitle: draftSubtitle })}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditingTitle(false)} className="px-4 py-2 bg-neutral-800 text-white rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-white text-xl font-bold">{config?.title}</p>
            <p className="text-orange-500">{config?.subtitle || "(No subtitle)"}</p>
          </div>
        )}
      </div>

      {/* Mission Statement */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Mission Statement</h3>
          {!editingMission && (
            <button onClick={startEditMission} className="text-orange-500 text-sm flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
        
        {editingMission ? (
          <div className="space-y-4">
            <textarea
              value={draftMission}
              onChange={(e) => setDraftMission(e.target.value)}
              rows={4}
              className="w-full bg-neutral-800 border border-white/10 rounded-lg px-4 py-3 text-white resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => saveConfig({ missionStatement: draftMission })}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditingMission(false)} className="px-4 py-2 bg-neutral-800 text-white rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-neutral-300">{config?.missionStatement || "(No mission statement)"}</p>
        )}
      </div>

      {/* Sections */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Sections</h3>
          <button onClick={addSection} className="text-orange-500 text-sm flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Section
          </button>
        </div>
        
        <div className="space-y-4">
          {(config?.sections || []).sort((a, b) => a.order - b.order).map((section) => (
            <div key={section.id} className="bg-neutral-800/50 p-4 rounded-lg">
              {editingSection === section.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={draftSection.title || ""}
                    onChange={(e) => setDraftSection({ ...draftSection, title: e.target.value })}
                    placeholder="Section title"
                    className="w-full bg-neutral-700 border border-white/10 rounded-lg px-4 py-2 text-white"
                  />
                  <textarea
                    value={draftSection.content || ""}
                    onChange={(e) => setDraftSection({ ...draftSection, content: e.target.value })}
                    rows={4}
                    placeholder="Section content"
                    className="w-full bg-neutral-700 border border-white/10 rounded-lg px-4 py-3 text-white resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveSectionEdit}
                      disabled={saving}
                      className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium"
                    >
                      <Save className="h-3 w-3" /> Save
                    </button>
                    <button onClick={() => setEditingSection(null)} className="px-3 py-1.5 bg-neutral-700 text-white rounded-lg text-xs">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{section.title}</h4>
                    <div className="flex gap-1">
                      <button onClick={() => startEditSection(section)} className="p-1 text-neutral-500 hover:text-white">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteSection(section.id)} className="p-1 text-neutral-500 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-neutral-400 text-sm line-clamp-2">{section.content}</p>
                </div>
              )}
            </div>
          ))}
          
          {(!config?.sections || config.sections.length === 0) && (
            <p className="text-neutral-500 text-center py-4">No sections yet. Add one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
