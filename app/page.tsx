"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, JSX } from "react";

export default function HomePage(): JSX.Element {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [open, setOpen] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  const [workflows, setWorkflows] = useState<any[]>([]);

  const fetchWorkflows = async () => {
    if (!user) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/${user.id}`,
    );

    const data = await res.json();

    setWorkflows(data || []);
  };

  const createWorkflow = async () => {
    console.log("clicked");
    if (!user) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workflow`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: user.id,
          name: "Untitled Workflow",
          nodes: [],
          edges: [],
        }),
      },
    );

    const data = await res.json();

    router.push(`/workflow/${data.id}`);
  };

  const handleStart = async (): Promise<void> => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    await createWorkflow();
  };

  //data for backend
  useEffect(() => {
    if (!user) return;

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        imageUrl: user.imageUrl,
      }),
    });
  }, [user]);

  //fetch workflows
  useEffect(() => {
    if (!isLoaded || !user) return;

    fetchWorkflows();
  }, [isLoaded, user]);

  const handleLogOut = async (): Promise<void> => {
    setOpen(false);
    await signOut({ redirectUrl: "/" });
  };

  const handleDelete = async (id: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/${id}`, {
      method: "DELETE",
    });

    setWorkflows((prev) => prev.filter((w) => w.id !== id));
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
                    {user?.username || user?.primaryEmailAddress?.emailAddress}
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
                <button className="text-left hover:text-white">Settings</button>
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
              onClick={createWorkflow}
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

          <div className="w-full max-w-screen">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <div
                onClick={handleStart}
                className="h-40 bg-white/5 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/10"
              >
                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-xl">
                  +
                </div>
              </div>

              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => router.push(`/workflow/${wf.id}`)}
                  className="cursor-pointer"
                >
                  <div className="relative h-40 bg-white/5 rounded-xl overflow-hidden">
                    <img
                      src={wf.image || "/images/hero-image.webp"}
                      className="w-full h-full object-cover"
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(wf.id);
                      }}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 p-2 rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="mt-2 text-sm font-medium">
                    {wf.name || "Untitled"}
                  </p>

                  <p className="text-xs text-white/50">
                    Edited {new Date(wf.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}

              {deleteId && (
                <div onClick={() => setDeleteId(null)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="bg-[#0b0b0b] p-6 rounded-xl w-80 border border-white/10">
                    <h2 className="text-lg mb-2">Delete Workflow?</h2>
                    <p className="text-sm text-white/50 mb-4">
                      This action cannot be undone.
                    </p>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDeleteId(null)}
                        className="px-4 py-2 text-sm bg-white/10 rounded-lg"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={async () => {
                          await handleDelete(deleteId);
                          setDeleteId(null);
                        }}
                        className="px-4 py-2 text-sm bg-red-500 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
