/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum FormativeComponent {
  CIENCIAS_BASICAS = 'Ciencias Básicas',
  ESPECIFICAS = 'Específicas',
  ELECTIVAS = 'Electivas',
  FORMACION_COMPLEMENTARIA = 'Formación Complementaria',
  INSTITUCIONALES = 'Institucionales',
}

export enum AcademicProgram {
  SISTEMAS = 'Ing. Sistemas',
  MECATRONICA = 'Ing. Mecatrónica',
  PROCESOS = 'Ing. Procesos',
  CIVIL = 'Ing. Civil',
  AMBIENTAL = 'Ing. Ambiental',
  MECANICA = 'Ing. Mecánica',
}

export interface Course {
  id: string;
  name: string;
  component: FormativeComponent;
  semester: number;
  credits: number;
  contactHours: number; // Horas presenciales
  independentHours: number; // Horas de trabajo independiente
  programs: AcademicProgram[];
  prerequisites: string[]; // List of course IDs
}
