/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Course, FormativeComponent, AcademicProgram } from '../types';

export const exportToExcel = (courses: Course[]) => {
  const data = courses.map((c) => ({
    Nombre: c.name,
    Componente: c.component,
    Semestre: c.semester,
    Créditos: c.credits,
    'Horas Presenciales': c.contactHours,
    'Horas Independientes': c.independentHours,
    Programas: c.programs.join(', '),
    Prerrequisitos: c.prerequisites.join(', '),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cursos');
  XLSX.writeFile(workbook, 'curricu_map_export.xlsx');
};

export const importFromExcel = (file: File): Promise<Partial<Course>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        // Helper to find a value by flexible key name (handling spaces, accents, case)
        const getVal = (row: any, ...aliases: string[]) => {
          const rowKeys = Object.keys(row);
          const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          
          for (const alias of aliases) {
            const normalizedAlias = normalize(alias);
            const foundKey = rowKeys.find(rk => normalize(rk) === normalizedAlias);
            if (foundKey) return row[foundKey];
          }
          return null;
        };

        const mappedData: Partial<Course>[] = json.map((row: any) => {
          const name = String(getVal(row, 'Nombre', 'Asignatura', 'Materia', 'Name') || '').trim();
          return {
            name,
            component: (getVal(row, 'Componente', 'Componente Formativo', 'Component') || FormativeComponent.ESPECIFICAS) as FormativeComponent,
            semester: Number(getVal(row, 'Semestre', 'Semester')) || 1,
            credits: Number(getVal(row, 'Créditos', 'Creditos', 'Credits')) || 0,
            contactHours: Number(getVal(row, 'Horas Presenciales', 'Horas P', 'Contact Hours')) || 0,
            independentHours: Number(getVal(row, 'Horas Independientes', 'Horas I', 'Independent Hours')) || 0,
            programs: String(getVal(row, 'Programas', 'Programs') || '').split(',').map((p: string) => p.trim() as AcademicProgram).filter(Boolean),
            prerequisites: String(getVal(row, 'Prerrequisitos', 'Prerrequisito', 'Prerequisites') || '').split(',').map((p: string) => p.trim()).filter(Boolean),
          };
        });
        
        resolve(mappedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
