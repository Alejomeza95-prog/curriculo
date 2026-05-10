/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { COMPONENT_COLORS } from '../constants';
import { Course, FormativeComponent } from '../types';
import { Users, Clock, GraduationCap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CourseNodeData = {
  course: Course;
  onEdit?: (course: Course) => void;
};

export function CourseNode({ data }: NodeProps<Node<CourseNodeData, 'course'>>) {
  const { course, onEdit } = data;
  const colors = COMPONENT_COLORS[course.component] || COMPONENT_COLORS[FormativeComponent.ESPECIFICAS];

  return (
    <div 
      className={cn(
        "px-2.5 py-1.5 rounded bg-white shadow-sm border border-slate-200 border-l-4 w-[105px] transition-all hover:shadow-md cursor-pointer",
        colors.border
      )}
      onClick={() => onEdit?.(course)}
    >
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-slate-300" />
      
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className={cn("text-[7px] font-bold px-1 py-0.5 rounded uppercase tracking-tight", colors.bg, colors.text)}>
            {course.component}
          </span>
          <span className="text-[8px] font-bold text-slate-400">S{course.semester}</span>
        </div>
        
        <h3 className="font-bold text-slate-800 text-[9px] leading-tight line-clamp-2">
          {course.name}
        </h3>

        <div className="flex justify-between items-center pt-1 border-t border-slate-50 mt-0.5">
          <div className="flex items-center gap-0.5">
            <GraduationCap size={9} className="text-slate-400" />
            <span className="text-[8px] font-medium text-slate-500">{course.credits}c</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Clock size={9} className="text-slate-400" />
            <span className="text-[8px] font-medium text-slate-500">{course.contactHours}/{course.independentHours}h</span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-slate-300" />
    </div>
  );
}
