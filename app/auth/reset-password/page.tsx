import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 shadow-lg">
            <span className="text-white text-2xl font-black">TF</span>
          </div>
          <h1 className="text-white text-2xl font-black">TrackFit Pro</h1>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
