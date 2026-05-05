import { useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Loader2, CheckCircle, X, Plus, User, Mail, Shield, Sparkles, BookOpen, Users, Target } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  created_at: string;
  profile: {
    skills?: string[];
    interests?: string;
    eligibility_status?: string;
    research_areas?: string[];
    max_capacity?: number;
    mentee_count?: number;
  } | null;
}

export const Profile = () => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [interests, setInterests] = useState('');
  const [researchAreas, setResearchAreas] = useState<string[]>([]);
  const [newResearchArea, setNewResearchArea] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(3);

  const { login, token } = useAuthStore();

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await authApi.get('/users/me');
        const data: UserProfile = response.data;
        setUserData(data);

        // Populate form fields
        setName(data.name);
        if (data.role === 'student' && data.profile) {
          setSkills(data.profile.skills || []);
          setInterests(data.profile.interests || '');
        }
        if (data.role === 'faculty' && data.profile) {
          setResearchAreas(data.profile.research_areas || []);
          setMaxCapacity(data.profile.max_capacity || 3);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleAddResearchArea = () => {
    const trimmed = newResearchArea.trim();
    if (trimmed && !researchAreas.includes(trimmed)) {
      setResearchAreas([...researchAreas, trimmed]);
      setNewResearchArea('');
    }
  };

  const handleRemoveResearchArea = (area: string) => {
    setResearchAreas(researchAreas.filter(a => a !== area));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const body: Record<string, any> = { name };

      if (userData?.role === 'student') {
        body.skills = skills;
        body.interests = interests;
      }
      if (userData?.role === 'faculty') {
        body.research_areas = researchAreas;
        body.max_capacity = maxCapacity;
      }

      await authApi.put('/users/me', body);

      // Update the Zustand store with the new name so the sidebar reflects it
      if (userData && token) {
        login({ ...userData, name, role: userData.role }, token);
      }

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Profile</h2>
        <p className="text-slate-500">Manage your account information.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-200">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Account Info Card ────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Account Information</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                  <User className="w-4 h-4 text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                  <Shield className="w-4 h-4 text-slate-400" />
                  Role
                </label>
                <input
                  type="text"
                  value={userData?.role || ''}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm capitalize cursor-not-allowed"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                  Member Since
                </label>
                <input
                  type="text"
                  value={userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : ''}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Student Profile Card ───────────────────── */}
        {userData?.role === 'student' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Student Profile</h3>
            </div>
            <div className="p-6 space-y-5">
              {/* Eligibility Status */}
              {userData.profile?.eligibility_status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Eligibility:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userData.profile.eligibility_status === 'eligible'
                      ? 'bg-emerald-100 text-emerald-800'
                      : userData.profile.eligibility_status === 'probation'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userData.profile.eligibility_status.charAt(0).toUpperCase() + userData.profile.eligibility_status.slice(1)}
                  </span>
                </div>
              )}

              {/* Skills */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  Skills
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {skills.length === 0 && (
                    <span className="text-sm text-slate-400">No skills added yet</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Add a skill (e.g., Python, Machine Learning)"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  Interests
                </label>
                <textarea
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                  placeholder="Describe your academic interests..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Faculty Profile Card ───────────────────── */}
        {userData?.role === 'faculty' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Faculty Profile</h3>
            </div>
            <div className="p-6 space-y-5">
              {/* Current Mentees */}
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Current Mentees</p>
                    <p className="text-xl font-bold text-slate-900">{userData.profile?.mentee_count ?? 0}</p>
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Max Capacity</p>
                    <p className="text-xl font-bold text-slate-900">{maxCapacity}</p>
                  </div>
                </div>
              </div>

              {/* Research Areas */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  Research Areas
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {researchAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => handleRemoveResearchArea(area)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {researchAreas.length === 0 && (
                    <span className="text-sm text-slate-400">No research areas added yet</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newResearchArea}
                    onChange={(e) => setNewResearchArea(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddResearchArea(); } }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Add a research area (e.g., NLP, Computer Vision)"
                  />
                  <button
                    type="button"
                    onClick={handleAddResearchArea}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Max Capacity */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                  <Target className="w-4 h-4 text-slate-400" />
                  Max Mentee Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 1)}
                  className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Save Button ────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
