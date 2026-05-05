import { useState, useEffect } from 'react';
import { projectApi } from '../services/api';
import { X, Loader2, FolderKanban, Users } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  status: string;
  faculty_name: string;
}

interface Group {
  group_id: string;
  name: string;
  my_status: string;
  members: { name: string; email: string; status: string }[];
}

interface RequestMentorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequested: () => void;
  facultyName: string;
}

export const RequestMentorModal = ({ isOpen, onClose, onRequested, facultyName }: RequestMentorModalProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [snippet, setSnippet] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedProjectId('');
      setSelectedGroupId('');
      setSnippet('');
      setWordCount(0);
      setError('');
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [projectsRes, groupsRes] = await Promise.all([
        projectApi.get('/projects'),
        projectApi.get('/groups/me'),
      ]);

      // Filter to only open projects by this faculty
      const allProjects: Project[] = projectsRes.data.projects || [];
      const facultyProjects = allProjects.filter(
        (p) => p.faculty_name === facultyName && p.status === 'open'
      );
      setProjects(facultyProjects);

      // Filter to groups the user has accepted
      const allGroups: Group[] = groupsRes.data.groups || [];
      setGroups(allGroups.filter((g) => g.my_status === 'accepted'));
    } catch {
      setProjects([]);
      setGroups([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSnippetChange = (value: string) => {
    setSnippet(value);
    setWordCount(value.trim().split(/\s+/).filter(Boolean).length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProjectId) { setError('Please select a project.'); return; }
    if (!selectedGroupId) { setError('Please select a group.'); return; }
    if (wordCount > 200) { setError('Snippet cannot exceed 200 words.'); return; }

    setIsLoading(true);
    try {
      await projectApi.post('/requests', {
        project_id: selectedProjectId,
        group_id: selectedGroupId,
        snippet,
      });
      onRequested();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Request Mentorship</h3>
            <p className="text-sm text-slate-500 mt-0.5">Apply to work with {facultyName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoadingData ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            {/* Project Selection */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                <FolderKanban className="w-4 h-4 text-slate-400" />
                Select Project
              </label>
              {projects.length === 0 ? (
                <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm">
                  {facultyName} has no open projects right now.
                </div>
              ) : (
                <select
                  required
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Group Selection */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                <Users className="w-4 h-4 text-slate-400" />
                Select Your Group
              </label>
              {groups.length === 0 ? (
                <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm">
                  You don't have any eligible groups. Create one with 3–5 accepted members first.
                </div>
              ) : (
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">Choose a group...</option>
                  {groups.map((g) => {
                    const accepted = g.members.filter((m) => m.status === 'accepted').length;
                    return (
                      <option key={g.group_id} value={g.group_id}>
                        {g.name} ({accepted} accepted members)
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Snippet */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700">Application Snippet</label>
                <span className={`text-xs font-medium ${wordCount > 200 ? 'text-red-500' : 'text-slate-400'}`}>
                  {wordCount}/200 words
                </span>
              </div>
              <textarea
                required
                value={snippet}
                onChange={(e) => handleSnippetChange(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                placeholder="Explain why your group is a great fit for this mentorship..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || projects.length === 0 || groups.length === 0}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
