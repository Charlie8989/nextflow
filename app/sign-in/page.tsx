"use client";

import { useClerk, useSignIn } from "@clerk/nextjs";
import Image from "next/image";
import { JSX, useState } from "react";

export default function SignInPage(): JSX.Element {
  const { redirectToSignIn } = useClerk();
  useSignIn();

  const [email, setEmail] = useState<string>("");

const handleGoogle = async () => {
  await redirectToSignIn({
    signInForceRedirectUrl: "/",
  });
};

const handleEmail = async (): Promise<void> => {
  try {
    await redirectToSignIn({
      signInForceRedirectUrl: "/",
      initialValues: {
        emailAddress: email,
      },
    });
  } catch {
    await redirectToSignIn({
      signInForceRedirectUrl: "/",
    });
  }
};

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white px-4">
      <div className="w-full max-w-5xl h-auto md:h-[550px] bg-[#0b0b0b] rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-xl">
        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-center">
          <h1 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8">
            Sign up to generate for free
          </h1>

          {(
            <>
              <button
                onClick={handleGoogle}
                className="bg-white text-black p-3 rounded-lg mb-4 flex items-center justify-center gap-2"
              >
                <Image src="/images/google.svg" width={20} height={20} className="h-5 w-5" alt="" />
                Continue with Google
              </button>

              <button className="bg-white/90 text-black p-3 rounded-lg mb-4 flex items-center justify-center gap-2">
                <Image src="/images/apple.png" width={20} height={20} className="h-5 w-5" alt="" />
                Continue with Apple
              </button>

              <button className="bg-white/90 text-black p-3 rounded-lg mb-6">
                Single Sign-On (SSO)
              </button>

              <div className="text-center text-gray-400 mb-4 text-sm">OR</div>

              <div id="clerk-captcha" />

              <input
                type="email"
                placeholder="Enter your email"
                className="p-3 rounded bg-black border border-white/10 mb-4 text-sm md:text-base"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
              />

              <button
                onClick={handleEmail}
                className="bg-blue-600 p-3 rounded-lg text-sm md:text-base"
              >
                Continue
              </button>
            </>
          )}

          <p className="text-xs text-gray-400 mt-6">
            By continuing, you agree to Terms & Privacy Policy
          </p>
        </div>

        <div className="hidden md:block w-1/2">
          <Image
            src="/images/auth-right.webp"
            width={500}
            height={550}
            sizes="50vw"
            className="h-full w-full object-cover"
            alt=""
          />
        </div>
      </div>
    </div>
  );
}
