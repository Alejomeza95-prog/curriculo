/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  OnNodesChange, 
  OnEdgesChange, 
  Connection, 
  addEdge,
  Panel,
  useViewport,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { 
  Plus, 
  Download, 
  Upload, 
  Filter, 
  MoreVertical, 
  Search,
  ChevronRight,
  BookOpen,
  LayoutDashboard,
  Trash2,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Course, FormativeComponent, AcademicProgram } from './types';
import { PROGRAMS, FORM_COMPONENTS, COMPONENT_COLORS } from './constants';
import { CourseNode } from './components/CourseNode';
import { exportToExcel, importFromExcel } from './lib/excel';

const nodeTypes = {
  course: CourseNode,
};

function downloadImage(dataUrl: string) {
  const a = document.createElement('a');
  a.setAttribute('download', 'curricumap-export.png');
  a.setAttribute('href', dataUrl);
  a.click();
}

function SemesterHeader({ stats }: { stats: Record<number, number> }) {
  const { x, zoom } = useViewport();
  return (
    <div 
      className="absolute top-0 left-0 pointer-events-none z-10 w-full overflow-hidden h-20"
    >
      <div 
        style={{ 
          transform: `translate(${x}px, 0) scale(${zoom})`, 
          transformOrigin: '0 0',
          display: 'flex',
          paddingTop: '12px'
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ width: 105, display: 'flex', justifyContent: 'center' }}>
            <div className="bg-white/95 backdrop-blur-sm border-t-4 border-blue-500 px-4 py-1.5 rounded shadow-lg pointer-events-auto transition-all hover:border-t-blue-400 w-[105px] flex justify-between items-center group">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-slate-500 transition-colors">Semestre</span>
                <span className="text-[11px] font-black text-slate-700 leading-none">{i + 1}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-slate-500 transition-colors">Créditos</span>
                <span className="text-[11px] font-black text-blue-600 leading-none">{stats[i + 1] || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SemesterLanes() {
  const { x, y, zoom } = useViewport();
  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: -1, left: 0, top: 0 }}
    >
      <div 
        style={{ 
          transform: `translate(${x}px, ${y}px) scale(${zoom})`, 
          transformOrigin: '0 0',
          display: 'flex',
          height: '10000px',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i} 
            style={{ 
              width: 105, 
              height: '100%',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <div 
              style={{ 
                width: 105, 
                height: '100%',
                backgroundColor: i % 2 === 0 ? 'rgba(241, 245, 249, 0.4)' : 'rgba(248, 250, 252, 0.1)',
                borderLeft: '1px solid rgba(226, 232, 240, 0.8)',
                borderRight: '1px solid rgba(226, 232, 240, 0.8)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<AcademicProgram | 'all'>('all');

  const onExportImage = () => {
    const element = document.getElementById('map-capture-area');
    if (element) {
      toPng(element, {
        backgroundColor: '#F1F5F9',
        cacheBust: true,
        filter: (node) => {
          const exclusionClasses = [
            'react-flow__controls',
            'react-flow__minimap',
            'react-flow__attribution'
          ];
          return !exclusionClasses.some(className => 
            (node as HTMLElement).classList?.contains(className)
          );
        }
      }).then(downloadImage);
    }
  };

  // Load initial example if empty
  useEffect(() => {
    if (courses.length === 0) {
      const exampleCourses: Course[] = [
        {
          id: '1',
          name: 'Cálculo Diferencial',
          component: FormativeComponent.CIENCIAS_BASICAS,
          semester: 1,
          credits: 4,
          contactHours: 64,
          independentHours: 128,
          programs: [AcademicProgram.SISTEMAS, AcademicProgram.MECATRONICA],
          prerequisites: [],
        },
        {
          id: '2',
          name: 'Cálculo Integral',
          component: FormativeComponent.CIENCIAS_BASICAS,
          semester: 2,
          credits: 4,
          contactHours: 64,
          independentHours: 128,
          programs: [AcademicProgram.SISTEMAS, AcademicProgram.MECATRONICA],
          prerequisites: ['1'],
        },
      ];
      setCourses(exampleCourses);
    }
  }, []);

  // Update nodes and edges whenever courses change
  useEffect(() => {
    const filteredCourses = courses.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProgram = selectedProgram === 'all' || c.programs.includes(selectedProgram);
      return matchesSearch && matchesProgram;
    });

    const COMPONENT_ORDER = [
      FormativeComponent.CIENCIAS_BASICAS,
      FormativeComponent.ESPECIFICAS,
      FormativeComponent.ELECTIVAS,
      FormativeComponent.FORMACION_COMPLEMENTARIA,
      FormativeComponent.INSTITUCIONALES,
    ];

    const semesterHeightCounters: Record<number, number> = {};

    const newNodes: Node[] = filteredCourses
      .sort((a, b) => {
        if (a.semester !== b.semester) return a.semester - b.semester;
        const aOrder = COMPONENT_ORDER.indexOf(a.component);
        const bOrder = COMPONENT_ORDER.indexOf(b.component);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      })
      .map((c) => {
        if (semesterHeightCounters[c.semester] === undefined) semesterHeightCounters[c.semester] = 55; // Small gap under header
        
        const y = semesterHeightCounters[c.semester];
        semesterHeightCounters[c.semester] += 100; // Space between even smaller nodes

        return {
          id: c.id,
          type: 'course',
          position: { 
            x: (c.semester - 1) * 105, 
            y: y
          },
          data: { 
            course: c,
            onEdit: (course: Course) => {
              setEditingCourse(course);
              setIsSidebarOpen(true);
            }
          },
        };
      });

    const newEdges: Edge[] = [];
    filteredCourses.forEach((c) => {
      c.prerequisites.forEach((preId) => {
        // Only draw edge if both nodes exist in filtered set
        if (filteredCourses.find(f => f.id === preId)) {
          newEdges.push({
            id: `e-${preId}-${c.id}`,
            source: preId,
            target: c.id,
            animated: true,
            style: { stroke: '#cbd5e1', strokeWidth: 1.8 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#cbd5e1',
            },
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [courses, searchQuery, selectedProgram]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      
      setCourses((prev) => prev.map(c => {
        if (c.id === params.target) {
          return {
            ...c,
            prerequisites: [...new Set([...c.prerequisites, params.source!])]
          };
        }
        return c;
      }));
    },
    []
  );

  const handleAddCourse = () => {
    setEditingCourse({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      component: FormativeComponent.CIENCIAS_BASICAS,
      semester: 1,
      credits: 0,
      contactHours: 0,
      independentHours: 0,
      programs: [],
      prerequisites: [],
    });
    setIsSidebarOpen(true);
  };

  const handleSaveCourse = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    setCourses((prev) => {
      const exists = prev.find((c) => c.id === editingCourse.id);
      if (exists) {
        return prev.map((c) => (c.id === editingCourse.id ? (editingCourse as Course) : c));
      }
      return [...prev, editingCourse as Course];
    });
    setIsSidebarOpen(false);
    setEditingCourse(null);
  };

  const handleDeleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setIsSidebarOpen(false);
    setEditingCourse(null);
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await importFromExcel(file);
        
        // Helper to generate consistent ID from name (slug)
        const generateId = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        const newCourses: Course[] = imported.map((c, i) => {
          const id = c.id || generateId(c.name || `materia-${i}`);
          return {
            ...c,
            id,
            name: c.name || 'Sin nombre',
            component: c.component || FormativeComponent.ESPECIFICAS,
            semester: Number(c.semester) || 1,
            credits: Number(c.credits) || 0,
            contactHours: Number(c.contactHours) || 0,
            independentHours: Number(c.independentHours) || 0,
            programs: c.programs || [],
            // Convert prerequisite names to IDs if they match a name in the import
            prerequisites: (c.prerequisites || []).map(preName => {
              const matched = imported.find(imp => imp.name === preName);
              return matched ? generateId(matched.name!) : generateId(preName);
            }),
          } as Course;
        });

        // Merge or replace? Let's merge by ID
        setCourses((prev) => {
          const merged = [...prev];
          newCourses.forEach(nc => {
            const idx = merged.findIndex(p => p.id === nc.id);
            if (idx > -1) merged[idx] = nc;
            else merged.push(nc);
          });
          return merged;
        });
        
        alert(`Se han importado ${newCourses.length} materias exitosamente.`);
      } catch (err) {
        console.error('Import error:', err);
        alert('Error al importar archivo. Verifique que sea un archivo Excel válido (.xlsx).');
      }
    }
  };

  // Compute summary stats
  const stats = useMemo(() => {
    const activeCourses = courses.filter(c => selectedProgram === 'all' || c.programs.includes(selectedProgram));
    return activeCourses.reduce((acc, c) => ({
      credits: acc.credits + c.credits,
      contact: acc.contact + c.contactHours,
      independent: acc.independent + (c.independentHours || 0),
      totalExpected: acc.totalExpected + (c.credits * 48)
    }), { credits: 0, contact: 0, independent: 0, totalExpected: 0 });
  }, [courses, selectedProgram]);

  const handleCreditsChange = (credits: number) => {
    const totalHours = credits * 48;
    const currentContact = editingCourse?.contactHours || 0;
    setEditingCourse({ 
      ...editingCourse, 
      credits, 
      independentHours: Math.max(0, totalHours - currentContact) 
    });
  };

  const handleContactHoursChange = (contactHours: number) => {
    const credits = editingCourse?.credits || 0;
    const totalHours = credits * 48;
    setEditingCourse({ 
      ...editingCourse, 
      contactHours, 
      independentHours: Math.max(0, totalHours - contactHours) 
    });
  };

  const semesterStats = useMemo(() => {
    const stats: Record<number, number> = {};
    const filtered = courses.filter(c => selectedProgram === 'all' || c.programs.includes(selectedProgram));
    filtered.forEach(c => {
      stats[c.semester] = (stats[c.semester] || 0) + c.credits;
    });
    return stats;
  }, [courses, selectedProgram]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar for Editing */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <LayoutDashboard className="text-blue-600" size={20} />
                  {editingCourse?.name ? 'Editar Curso' : 'Nueva Asignatura'}
                </h2>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Información Básica</h3>
                  
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Nombre del Curso</label>
                    <input
                      type="text"
                      required
                      value={editingCourse?.name || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-sm font-medium"
                      placeholder="Ej. Cálculo Integral"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Semestre</label>
                      <select
                        value={editingCourse?.semester || 1}
                        onChange={(e) => setEditingCourse({ ...editingCourse, semester: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:border-blue-500 focus:bg-white focus:outline-none text-sm appearance-none"
                      >
                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}º Semestre</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Créditos</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editingCourse?.credits || 0}
                        onChange={(e) => handleCreditsChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:border-blue-500 focus:bg-white focus:outline-none text-sm"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 italic">{(editingCourse?.credits || 0) * 48} horas totales sugeridas</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Componente Formativa</label>
                    <select
                      value={editingCourse?.component}
                      onChange={(e) => setEditingCourse({ ...editingCourse, component: e.target.value as FormativeComponent })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:border-blue-500 focus:bg-white focus:outline-none text-sm"
                    >
                      {FORM_COMPONENTS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Distribución de Horas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Presenciales</label>
                      <input
                        type="number"
                        value={editingCourse?.contactHours || 0}
                        onChange={(e) => handleContactHoursChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:border-blue-500 focus:bg-white focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Independientes</label>
                      <input
                        type="number"
                        value={editingCourse?.independentHours || 0}
                        onChange={(e) => setEditingCourse({ ...editingCourse, independentHours: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:border-blue-500 focus:bg-white focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Prerrequisitos</h3>
                  <div className="grid grid-cols-1 gap-2 border border-slate-100 rounded-lg p-2 max-h-48 overflow-y-auto bg-slate-50/30">
                    {courses
                      .filter(c => c.id !== editingCourse?.id)
                      .map(course => (
                        <label key={course.id} className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm rounded-md cursor-pointer transition-all">
                          <input
                            type="checkbox"
                            checked={editingCourse?.prerequisites?.includes(course.id)}
                            onChange={(e) => {
                              const current = editingCourse?.prerequisites || [];
                              const updated = e.target.checked 
                                ? [...current, course.id]
                                : current.filter(id => id !== course.id);
                              setEditingCourse({ ...editingCourse, prerequisites: updated });
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700">{course.name}</span>
                            <span className="text-[9px] text-slate-400">Semestre {course.semester}</span>
                          </div>
                        </label>
                      ))}
                    {courses.filter(c => c.id !== editingCourse?.id).length === 0 && (
                      <p className="text-[10px] text-slate-400 italic p-2 text-center">No hay otras materias disponibles</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Programas Participantes</h3>
                  <div className="grid grid-cols-1 gap-2 border border-slate-100 rounded-lg p-2 max-h-48 overflow-y-auto bg-slate-50/30">
                    {PROGRAMS.map(prog => (
                      <label key={prog} className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm rounded-md cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={editingCourse?.programs?.includes(prog as AcademicProgram)}
                          onChange={(e) => {
                            const current = editingCourse?.programs || [];
                            const updated = e.target.checked 
                              ? [...current, prog as AcademicProgram]
                              : current.filter(p => p !== prog);
                            setEditingCourse({ ...editingCourse, programs: updated });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-slate-600">{prog}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveCourse}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-md font-semibold text-sm hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 active:scale-95"
                >
                  Guardar Configuración
                </button>
                {editingCourse?.id && (
                  <button
                    type="button"
                    onClick={() => editingCourse.id && handleDeleteCourse(editingCourse.id)}
                    className="p-2.5 border border-rose-100 text-rose-500 rounded-md hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <BookOpen className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">CurricuMap</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative mr-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shadow-none" size={14} />
              <input
                type="text"
                placeholder="Buscar asignatura..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md w-48 focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-sm"
              />
            </div>
            
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value as AcademicProgram | 'all')}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:outline-none cursor-pointer hover:bg-slate-100 transition-all mr-4"
            >
              <option value="all">Todos los Programas</option>
              {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <button 
              onClick={onExportImage}
              className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2 text-slate-600 transition-colors"
              title="Exportar como Imagen"
            >
              <ImageIcon size={16} /> Imagen
            </button>

            <button 
              onClick={() => exportToExcel(courses)}
              className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2 text-slate-600 transition-colors"
            >
              <Download size={16} /> Exportar
            </button>

            <label className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2 text-slate-600 transition-colors cursor-pointer">
              <Upload size={16} /> Importar
              <input type="file" onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
            </label>

            <button 
              onClick={handleAddCourse}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all active:scale-95 ml-2"
            >
              <Plus size={16} />
              <span>Nueva Asignatura</span>
            </button>
          </div>
        </header>

        {/* Map Area */}
        <div id="map-capture-area" className="flex-1 relative overflow-hidden bg-[#F1F5F9]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            elevateEdgesOnSelect={true}
            selectionKeyCode="Control"
            multiSelectionKeyCode="Control"
            deleteKeyCode="Delete"
          >
            <Background color="#CBD5E1" gap={24} size={1} />
            
            <SemesterLanes />
            <SemesterHeader stats={semesterStats} />

            <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-md" />
            <MiniMap 
              className="!bg-white !border-slate-200 !shadow-sm !rounded-lg" 
              nodeColor={(node) => {
                const c = (node.data as any)?.course?.component;
                if (c === FormativeComponent.CIENCIAS_BASICAS) return '#3b82f6';
                if (c === FormativeComponent.ESPECIFICAS) return '#10b981';
                if (c === FormativeComponent.ELECTIVAS) return '#8b5cf6';
                if (c === FormativeComponent.FORMACION_COMPLEMENTARIA) return '#f59e0b';
                if (c === FormativeComponent.INSTITUCIONALES) return '#94a3b8';
                return '#cbd5e1';
              }}
            />
            
            <Panel position="top-left" className="bg-white/90 backdrop-blur-sm p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2 mt-4 ml-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leyenda Componentes</h3>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-semibold text-slate-600">Ciencias Básicas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-semibold text-slate-600">Específicas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-[10px] font-semibold text-slate-600">Electivas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-semibold text-slate-600">Complementaria</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-600">Institucional</span>
                </div>
            </Panel>

            <Panel position="bottom-right" className="mb-6 mr-6">
               <div className="w-64 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl border border-slate-700">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Resumen del Programa</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Créditos:</span>
                    <span className="font-bold">{stats.credits} <span className="font-normal opacity-50 ml-1">({stats.totalExpected}h)</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Horas Presenciales:</span>
                    <span className="font-bold text-blue-400">{stats.contact}h</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Horas Independientes:</span>
                    <span className="font-bold text-emerald-400">{stats.independent}h</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Total Trabajo Académico:</span>
                    <span className="font-bold text-amber-400">{stats.contact + stats.independent}h</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <p className="text-[9px] text-slate-500 italic text-center">
                    Cálculo basado en selección actual de programas y filtros.
                  </p>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
