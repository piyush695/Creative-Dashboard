import HomeOverviewView from "@/components/home-overview-view";

export const metadata = {
  title: "Overview · Hola Prime",
};

export default function OverviewPage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-6 py-6">
      <HomeOverviewView />
    </div>
  );
}
