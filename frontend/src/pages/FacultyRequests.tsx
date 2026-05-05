import { useState, useEffect, useCallback } from 'react';
import { projectApi } from '../services/api';
import {
  Loader2, CheckCircle, XCircle, Clock, Users, FolderKanban,
  ChevronDown, ChevronUp, CheckCheck
} from 'lucide-react';

interface Member {
  name: string;
  email: string;
}

interface MentorshipRequest {
  request_id: string;
  snippet: string;
  request_status: string;
  created_at: string;
  project_id: string;
  project_title: string;
  group_id: string;
  group_name: string;
  leader_name: string;
  members: Member[];
}

export const FacultyRequests = () => {
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completingProjectId, setCompletingProjectId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await projectApi.get('/requests/faculty');
      setRequests(response.data.requests || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load requests.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (requestId: string, status: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    setError('');
    setSuccessMsg('');
    try {
      await projectApi.put(`/requests/${requestId}/status`, { status });
      setSuccessMsg(`Request ${status} successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${status} request.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCompleteProject = async (projectId: string) => {
    setCompletingProjectId(projectId);
    setError('');
    setSuccessMsg('');
    try {
      // The backend doesn't have a dedicated "complete" endpoint,
      // but we can mark it as closed. Adjust if you add one later.
      await projectApi.put(`/projects/${projectId}`, { status: 'closed' });
      setSuccessMsg('Project marked as completed!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchRequests();
    } catch (err: any) {
      // If PUT /projects/:id doesn't exist, show a graceful error
      setError(err.response?.data?.error || 'Failed to update project status.');
    } finally {
      setCompletingProjectId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.request_status === 'pending');
  const decidedRequests = requests.filter(r => r.request_status !== 'pending');

  // Unique in-progress projects (accepted requests)
  const acceptedProjects = requests
    .filter(r => r.request_status === 'accepted')
    .reduce((acc, r) => {
      if (!acc.find(p => p.project_id === r.project_id)) {
        acc.push(r);
      }
      return acc;
    }, [] as MentorshipRequest[]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mentorship Requests</h2>
        <p className="text-slate-500">Review and manage student mentorship requests.</p>
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

      {/* Active Projects (accepted) */}
      {acceptedProjects.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-500" />
            Active Projects ({acceptedProjects.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {acceptedProjects.map((r) => (
              <div key={r.project_id} className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">{r.project_title}</h4>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Group: <span className="font-medium">{r.group_name}</span> · Led by {r.leader_name}
                  </p>
                </div>
                <button
                  onClick={() => handleCompleteProject(r.project_id)}
                  disabled={completingProjectId === r.project_id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors shrink-0"
                >
                  {completingProjectId === r.project_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  Mark Complete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Pending Requests ({pendingRequests.length})
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No pending requests right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => {
              const isExpanded = expandedId === req.request_id;
              return (
                <div key={req.request_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderKanban className="w-4 h-4 text-primary-500" />
                        <h4 className="text-base font-semibold text-slate-900">{req.project_title}</h4>
                      </div>
                      <p className="text-sm text-slate-500">
                        From <span className="font-medium text-slate-700">{req.group_name}</span> · Led by {req.leader_name} · {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpdateStatus(req.request_id, 'accepted')}
                        disabled={processingId === req.request_id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {processingId === req.request_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(req.request_id, 'rejected')}
                        disabled={processingId === req.request_id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Expandable details */}
                  <div className="px-5 pb-1">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.request_id)}
                      className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 mb-3"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                      {/* Snippet */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Application Snippet</p>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.snippet}</p>
                        </div>
                      </div>

                      {/* Members */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Group Members ({req.members?.length || 0})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(req.members || []).map((m) => (
                            <div key={m.email} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs shrink-0">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                                <p className="text-xs text-slate-500 truncate">{m.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Decisions */}
      {decidedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Past Decisions ({decidedRequests.length})
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Group</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decidedRequests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900">{req.project_title}</td>
                    <td className="px-6 py-3 text-slate-600">{req.group_name}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        req.request_status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {req.request_status === 'accepted' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {req.request_status.charAt(0).toUpperCase() + req.request_status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
