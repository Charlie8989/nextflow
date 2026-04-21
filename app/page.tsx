"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, JSX } from "react";

export default function HomePage(): JSX.Element {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStart = (): void => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in");
    } else {
      router.push("/nodes");
    }
  };

const handleLogOut = async (): Promise<void> => {
  setOpen(false);
  await signOut({ redirectUrl: "/" });
};
  return (
    <div className="min-h-screen bg-black text-white flex">
      <div className="hidden md:flex w-[72px] bg-[#0b0b0b] flex-col items-center py-4 border-r border-white/10 relative">
        <div className="mt-auto relative" ref={ref}>
          {isLoaded && user ? (
            <img
              src={user.imageUrl}
              onClick={() => setOpen((p) => !p)}
              className="w-10 h-10 rounded-xl object-cover cursor-pointer"
            />
          ) : (
            <div className="w-10 h-10 bg-white/10 rounded-xl" />
          )}

          {open && (
            <div className="z-99 absolute bottom-6 left-8 w-64 bg-[#0b0b0b] border border-white/10 rounded-xl p-3 shadow-xl">
              <div className="mb-3">
                <p className="text-sm text-white/80">Workspaces</p>

                <div className="mt-2 bg-white/5 p-2 rounded-lg">
                  <p className="text-sm font-medium">
                    {user?.username ||
                      user?.primaryEmailAddress?.emailAddress}
                  </p>
                  <p className="text-xs text-white/50">Free</p>
                </div>

                <button className="mt-2 text-sm text-white/70 hover:text-white">
                  + Add workspace
                </button>
              </div>

              <div className="border-t border-white/10 my-3" />

              <div className="bg-black p-3 rounded-lg mb-3">
                <p className="text-sm">39 Credits remaining</p>
                <p className="text-xs text-white/50">100 per day</p>
              </div>

              <div className="flex flex-col gap-2 text-sm text-white/80">
                <button className="text-left hover:text-white">
                  Upgrade plan
                </button>
                <button className="text-left hover:text-white">
                  Buy credits
                </button>
                <button className="text-left hover:text-white">
                  Settings
                </button>
                <button className="text-left hover:text-white">
                  Usage Statistics
                </button>
              </div>

              <div className="border-t border-white/10 my-3" />

              <button
                onClick={handleLogOut}
                className="text-left text-sm text-red-400 hover:text-red-500"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-[50%] md:h-[60%] relative flex items-center">
          <img
            src="/images/hero-image.webp"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/40" />

          <div className="relative z-10 px-6 mx-8 md:mx-12 md:px-12 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <img
                src="/images/nodes.webp"
                className="w-10 h-10 md:w-10 md:h-10"
              />
              <p className="text-sm font-light md:text-3xl">Node Editor</p>
            </div>

            <p className="text-white/80 leading-relaxed mb-28">
              Nodes is the most powerful way to operate Krea. Connect every tool
              and model into complex automated pipelines.
            </p>

            <button
              onClick={() => router.push("/workflow")}
              className="bg-white text-black px-6 md:px-8 py-2 md:py-2 rounded-full text-sm font-medium"
            >
              New Workflow →
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gradient-to-b from-black to-[#050505] p-6 md:p-10">
          <div className="flex gap-4 md:gap-6 mb-6 md:mb-8 text-white/70 overflow-x-auto">
            <button className="bg-white/10 text-white px-4 py-2 rounded-lg whitespace-nowrap">
              Projects
            </button>
            <button className="whitespace-nowrap">Apps</button>
            <button className="whitespace-nowrap">Examples</button>
            <button className="whitespace-nowrap">Templates</button>
          </div>

          <div className="flex flex-col items-center justify-center h-[60%] text-center">
            <img src="/images/nodes.webp" className="size-8 md:size-10 mt-10" />
            <h2 className="text-lg md:text-xl mb-2">No Workflows Yet</h2>
            <p className="text-white/50 mb-6 text-sm md:text-base">
              You haven't created any workflows yet.
            </p>
            <button
              onClick={handleStart}
              className="bg-white text-black px-6 md:px-8 py-2 md:py-2 rounded-full text-sm font-medium"
            >
              New Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}