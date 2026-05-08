"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { UserPlus } from "lucide-react";
import { ApproverRow } from "./ApproverRow";
import type { ApprovalStage } from "./types";

export function ApproversList({
  stages,
  onChange,
  onAdd,
  requireOrder,
}: {
  stages: ApprovalStage[];
  onChange: (stages: ApprovalStage[]) => void;
  onAdd: () => void;
  requireOrder: boolean;
}) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const next = Array.from(stages);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onChange(next);
  };

  const updateStage = (id: string, value: ApprovalStage) => {
    onChange(stages.map((s) => (s.id === id ? value : s)));
  };

  const removeStage = (id: string) => {
    if (stages.length <= 1) return;
    onChange(stages.filter((s) => s.id !== id));
  };

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="approval-stages">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {stages.map((stage, idx) => (
                <Draggable key={stage.id} draggableId={stage.id} index={idx}>
                  {(prov, snapshot) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      className={snapshot.isDragging ? "shadow-lg rounded-lg bg-white" : ""}
                    >
                      <ApproverRow
                        stage={stage}
                        index={idx}
                        showNumber={requireOrder}
                        canRemove={stages.length > 1}
                        dragHandleProps={prov.dragHandleProps}
                        onChange={(updated) => updateStage(stage.id, updated)}
                        onRemove={() => removeStage(stage.id)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#4258A5] font-medium hover:underline"
      >
        <UserPlus className="w-4 h-4" /> Add additional recipient
      </button>
    </div>
  );
}
