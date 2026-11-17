import { requireOrg } from "@/lib/auth";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const { org, role } = await requireOrg();

  return (
    <div className="space-y-12 py-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-5xl font-serif text-on-surface tracking-tighter mb-4">Configuration</h1>
        <p className="text-on-surface-muted text-lg font-serif leading-relaxed">
          Your company profile and calling agent.
        </p>
      </div>

      <SettingsForm
        canEdit={role === "owner"}
        defaults={{
          name: org.name,
          agent_name: org.agent_name,
          language: org.language,
          dograh_trigger_uuid: org.dograh_trigger_uuid ?? "",
        }}
      />
    </div>
  );
}
