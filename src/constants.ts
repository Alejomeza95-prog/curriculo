/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormativeComponent } from './types';

export const COMPONENT_COLORS: Record<FormativeComponent, { bg: string; border: string; text: string }> = {
  [FormativeComponent.CIENCIAS_BASICAS]: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-blue-700',
  },
  [FormativeComponent.ESPECIFICAS]: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    text: 'text-emerald-700',
  },
  [FormativeComponent.ELECTIVAS]: {
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    text: 'text-purple-700',
  },
  [FormativeComponent.FORMACION_COMPLEMENTARIA]: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-700',
  },
  [FormativeComponent.INSTITUCIONALES]: {
    bg: 'bg-slate-50',
    border: 'border-slate-400',
    text: 'text-slate-700',
  },
};

export const PROGRAMS = [
  'Ing. Sistemas',
  'Ing. Mecatrónia',
  'Ing. Procesos',
  'Ing. Civil',
  'Ing. Ambiental',
  'Ing. Mecánica',
];

export const FORM_COMPONENTS = [
  'Ciencias Básicas',
  'Específicas',
  'Electivas',
  'Formación Complementaria',
  'Institucionales',
];
