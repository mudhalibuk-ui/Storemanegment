
import React, { useState } from 'react';
import { Project, ProjectTask, TaskStatus, User, UserRole } from '../types';
import { API } from '../services/api';

interface ProjectManagementProps {
  projects: Project[];
  tasks: ProjectTask[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ projects, tasks, users, currentUser, onRefresh }) => {
  const [activeProjectId, setActiveProjectId] = useState<string | 'all'>('all');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<ProjectTask> | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredTasks = activeProjectId === 'all' ? tasks : tasks.filter(t => t.projectId === activeProjectId);

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject?.name) return;

    setLoading(true);
    try {
      await API.projects.saveProject({
        ...editingProject,
        xarunId: currentUser.xarunId,
        managerId: editingProject.managerId || currentUser.id,
        status: editingProject.status || 'ACTIVE',
        startDate: editingProject.startDate || new Date().toISOString().split('T')[0]
      });
      setIsProjectModalOpen(false);
      setEditingProject(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask?.projectId || !editingTask?.title) return;

    setLoading(true);
    try {
      const project = projects.find(p => p.id === editingTask.projectId);
      await API.projects.saveTask({
        ...editingTask,
        projectName: project?.name || 'Unknown Project',
        status: editingTask.status || TaskStatus.TODO,
        priority: editingTask.priority || 'MEDIUM'
      });
      setIsTaskModalOpen(false);
      setEditingTask(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (task: ProjectTask, newStatus: TaskStatus) => {
    try {
      await API.projects.saveTask({ ...task, status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Project Management</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tasks, Timelines & Collaboration</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setEditingProject({}); setIsProjectModalOpen(true); }}
            className="bg-white text-slate-800 border border-slate-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
          >
            <span>+</span> New Project
          </button>
          <button
            onClick={() => { setEditingTask({ projectId: activeProjectId === 'all' ? '' : activeProjectId }); setIsTaskModalOpen(true); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            <span>+</span> New Task
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-250px)]">
        {/* PROJECTS SIDEBAR */}
        <div className="w-64 flex-shrink-0 space-y-4 overflow-y-auto no-scrollbar">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Projects</h3>
          <button
            onClick={() => setActiveProjectId('all')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
              activeProjectId === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="font-bold text-xs">All Tasks</span>
          </button>
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => setActiveProjectId(project.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all group ${
                activeProjectId === project.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold text-xs truncate">{project.name}</div>
              <div className={`text-[8px] font-black uppercase mt-1 ${activeProjectId === project.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                {tasks.filter(t => t.projectId === project.id).length} Tasks
              </div>
            </button>
          ))}
        </div>

        {/* TASKS KANBAN */}
        <div className="flex-1 flex gap-6 overflow-x-auto no-scrollbar pb-6">
          {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE].map(status => (
            <div key={status} className="flex-shrink-0 w-80 bg-slate-100/50 rounded-[2rem] p-4 border border-slate-200/50 flex flex-col">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{status}</h3>
                <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-black text-slate-400 border border-slate-200">
                  {filteredTasks.filter(t => t.status === status).length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                {filteredTasks.filter(t => t.status === status).map(task => (
                  <div
                    key={task.id}
                    onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                        task.priority === 'HIGH' ? 'bg-rose-100 text-rose-600' :
                        task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-200">
                          {task.assignedTo.charAt(0)}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{task.assignedTo}</span>
                      </div>
                      {task.dueDate && (
                        <div className="text-[9px] font-bold text-slate-400">📅 {task.dueDate}</div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-1">
                      {status === TaskStatus.TODO && (
                        <button onClick={(e) => { e.stopPropagation(); updateTaskStatus(task, TaskStatus.IN_PROGRESS); }} className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">Start</button>
                      )}
                      {status === TaskStatus.IN_PROGRESS && (
                        <button onClick={(e) => { e.stopPropagation(); updateTaskStatus(task, TaskStatus.DONE); }} className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors">Complete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROJECT MODAL */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">New Project</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Define project scope and goals</p>
              </div>
              <button onClick={() => setIsProjectModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveProject} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={editingProject?.name || ''}
                  onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Warehouse Expansion Q2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
                <textarea
                  value={editingProject?.description || ''}
                  onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all h-24 no-scrollbar"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editingProject?.startDate || ''}
                    onChange={e => setEditingProject({ ...editingProject, startDate: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Manager</label>
                  <select
                    value={editingProject?.managerId || currentUser.id}
                    onChange={e => setEditingProject({ ...editingProject, managerId: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Project Task</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Assign work to team members</p>
              </div>
              <button onClick={() => setIsTaskModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveTask} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project</label>
                <select
                  required
                  value={editingTask?.projectId || ''}
                  onChange={e => setEditingTask({ ...editingTask, projectId: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={editingTask?.title || ''}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Assigned To</label>
                  <select
                    required
                    value={editingTask?.assignedTo || ''}
                    onChange={e => setEditingTask({ ...editingTask, assignedTo: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Select Member</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Priority</label>
                  <select
                    value={editingTask?.priority || 'MEDIUM'}
                    onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
