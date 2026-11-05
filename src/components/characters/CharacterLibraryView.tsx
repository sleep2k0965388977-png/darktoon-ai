"use client";

import React, { useEffect, useState } from "react";
import {
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Unlock,
  UserPlus,
} from "lucide-react";
import {
  ALL_ACTIONS,
  ALL_EXPRESSIONS,
  CharacterAction,
  CharacterExpression,
  CharacterProfile,
} from "@/types/darktoon";
import { DarktoonStageCanvas } from "@/components/animation/DarktoonStageCanvas";
import { useDarktoonStore } from "@/stores/useDarktoonStore";

export const CharacterLibraryView: React.FC = () => {
  const { activeProject, characters, loadProjectWorkspace, notify } =
    useDarktoonStore();

  const [selectedCharId, setSelectedCharId] = useState<string | null>(
    characters[0]?.id || null
  );
  const [testAction, setTestAction] = useState<CharacterAction>("holding_phone");
  const [testExpression, setTestExpression] =
    useState<CharacterExpression>("sad");
  const [animClock, setAnimClock] = useState(0);
  const [newCharName, setNewCharName] = useState("");
  const [newCharRole, setNewCharRole] =
    useState<CharacterProfile["role"]>("supporting");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimClock((t) => Number((t + 0.08).toFixed(2)));
    }, 80);
    return () => clearInterval(timer);
  }, []);

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-[#92929B]">
        Vui lòng chọn dự án trước.
      </div>
    );
  }

  const activeChar =
    characters.find((c) => c.id === selectedCharId) || characters[0];

  const handleToggleLock = async (char: CharacterProfile) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/characters/${char.id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !char.locked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Lỗi khóa nhân vật.");
      await loadProjectWorkspace(activeProject.id);
      notify(
        "success",
        data.character.locked
          ? `Đã KHÓA thiết kế nhân vật '${char.name}'. Mọi cảnh tiếp theo bắt buộc giữ nguyên thiết kế này.`
          : `Đã mở khóa thiết kế nhân vật '${char.name}'.`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateRef = async (char: CharacterProfile) => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/v1/characters/${char.id}/generate-reference`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "mock" }),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message || "Lỗi tạo reference sheet.");
      await loadProjectWorkspace(activeProject.id);
      notify(
        "success",
        `Đã tạo Character Reference Sheet mới (Asset v${data.asset?.version}) cho '${char.name}'.`
      );
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${activeProject.id}/characters`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCharName.trim(),
            role: newCharRole,
            locked: true,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Lỗi tạo nhân vật.");
      setNewCharName("");
      await loadProjectWorkspace(activeProject.id);
      setSelectedCharId(data.character.id);
      notify("success", `Đã thêm nhân vật '${data.character.name}' vào thư viện.`);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#292930] pb-4">
        <div>
          <h1 className="text-lg font-bold text-[#F5F5F5]">
            Character Library & 8-Part 2D Rig Consistency Engine
          </h1>
          <p className="text-xs text-[#92929B]">
            Quản lý hồ sơ nhân vật cố định (Character Profile). Khi khóa thiết kế (locked = true), AI không được phép vẽ lại nhân vật khác giữa các cảnh.
          </p>
        </div>

        {/* Create New Character Form */}
        <form
          onSubmit={handleCreateCharacter}
          className="flex items-center gap-2 rounded-lg border border-[#292930] bg-[#18181D] p-2"
        >
          <UserPlus className="h-4 w-4 text-[#92929B] ml-1" />
          <input
            type="text"
            placeholder="Tên nhân vật mới..."
            value={newCharName}
            onChange={(e) => setNewCharName(e.target.value)}
            className="rounded border border-[#292930] bg-[#0B0B0D] px-2.5 py-1 text-xs text-[#F5F5F5] focus:border-[#F04444] focus:outline-none"
          />
          <select
            value={newCharRole}
            onChange={(e) =>
              setNewCharRole(e.target.value as CharacterProfile["role"])
            }
            className="rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-xs text-[#F5F5F5]"
          >
            <option value="protagonist">Chính (Trắng ngà #F4F1EA)</option>
            <option value="deuteragonist">Phụ / Bạn (Xám #CBD5E1)</option>
            <option value="shadow">Bóng tối tâm lý (Đen viền Đỏ)</option>
            <option value="supporting">Nhân vật phụ</option>
          </select>
          <button
            type="submit"
            disabled={busy || !newCharName.trim()}
            className="flex items-center gap-1 rounded bg-[#F04444] px-3 py-1 text-xs font-semibold text-white hover:bg-[#dc3535] disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm
          </button>
        </form>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Character Cards List (5 cols) */}
        <div className="col-span-5 space-y-3">
          {characters.map((char) => {
            const isSelected = char.id === activeChar?.id;
            return (
              <div
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  isSelected
                    ? "border-[#F04444] bg-[#18181D]"
                    : "border-[#292930] bg-[#111114] hover:border-[#3A3A46]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border"
                        style={{
                          backgroundColor: char.color_palette.fill,
                          borderColor: char.color_palette.stroke,
                        }}
                      />
                      <h3 className="text-sm font-semibold text-[#F5F5F5]">
                        {char.name}
                      </h3>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-[#92929B]">
                      ID: {char.id.slice(0, 12)}... · Role:{" "}
                      <span className="uppercase text-[#F5F5F5]">
                        {char.role}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLock(char);
                    }}
                    className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                      char.locked
                        ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40"
                        : "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40"
                    }`}
                  >
                    {char.locked ? (
                      <>
                        <Lock className="h-3 w-3" /> LOCKED
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3 w-3" /> UNLOCKED
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-[#92929B]">
                  {char.design_description}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-[#292930] pt-2.5 text-[11px] text-[#92929B]">
                  <span>
                    8 Rig Layers · {char.expressions.length} Biểu cảm ·{" "}
                    {char.actions.length} Hành động
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateRef(char);
                    }}
                    className="flex items-center gap-1 rounded border border-[#292930] bg-[#0B0B0D] px-2 py-1 text-[11px] text-[#F5F5F5] hover:border-[#F04444] cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Tạo Reference Sheet
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live 8-Part 2D Rig Interactive Sandbox (7 cols) */}
        <div className="col-span-7 rounded-lg border border-[#292930] bg-[#18181D] p-5 space-y-4">
          {activeChar && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
                    2D Rig Inspector: {activeChar.name}
                  </h3>
                  <p className="text-xs text-[#92929B]">
                    8 bộ phận điều khiển độc lập: Head, Body, Left Arm, Right Arm, Left Leg, Right Leg, Eyes, Mouth
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#92929B]">
                  <span>Action: {testAction}</span> ·{" "}
                  <span>Expr: {testExpression}</span>
                </div>
              </div>

              <DarktoonStageCanvas
                aspectRatio="16:9"
                backgroundId="bg_mind_void"
                characters={[
                  {
                    profile: activeChar,
                    action: testAction,
                    expression: testExpression,
                    position: "center",
                  },
                ]}
                props={[]}
                cameraShot="medium"
                cameraMovement="static"
                subtitleText={`${activeChar.name} — Hành động: ${testAction} + Biểu cảm: ${testExpression}`}
                timeInSceneSec={animClock}
                isPlaying={testAction === "talking"}
              />

              {/* 10 Expressions Selector */}
              <div>
                <div className="mb-1.5 text-xs font-semibold text-[#F5F5F5]">
                  Bộ 10 Biểu cảm bắt buộc (Expressions):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_EXPRESSIONS.map((expr) => (
                    <button
                      key={expr}
                      type="button"
                      onClick={() => setTestExpression(expr)}
                      className={`rounded px-2.5 py-1 text-xs capitalize transition cursor-pointer ${
                        testExpression === expr
                          ? "bg-[#F04444] text-white font-semibold"
                          : "border border-[#292930] bg-[#111114] text-[#92929B] hover:text-[#F5F5F5]"
                      }`}
                    >
                      {expr}
                    </button>
                  ))}
                </div>
              </div>

              {/* 17 Actions Selector */}
              <div>
                <div className="mb-1.5 text-xs font-semibold text-[#F5F5F5]">
                  Bộ 17 Hành động khớp xương 2D (Combinable Actions):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ACTIONS.map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setTestAction(act)}
                      className={`rounded px-2.5 py-1 text-xs transition cursor-pointer ${
                        testAction === act
                          ? "bg-[#F04444] text-white font-semibold"
                          : "border border-[#292930] bg-[#111114] text-[#92929B] hover:text-[#F5F5F5]"
                      }`}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
