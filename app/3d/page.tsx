import type { Metadata } from "next";
import Studio3D from "@/components/Studio3D";
export const metadata: Metadata = {
    title: "Cura — avatar bench",
    description: "3D avatar and lip-sync harness for the Cura companion.",
};
export default function ThreeDPage() {
    return <Studio3D />;
}
