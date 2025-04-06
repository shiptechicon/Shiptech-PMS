import { useEffect, useState } from "react";
import { Link, Routes, Route } from "react-router-dom";
import {
  OutsourceTeam,
  useOutsourceTeamStore,
} from "@/store/outsourceTeamStore";
import { Settlement, useSettlementStore } from "@/store/settlementStore";
import NewTeam from "./NewTeam";
import TeamDetails from "./TeamDetails";
import EditTeam from "./EditTeam";
import { Edit, ExternalLink, Trash } from "lucide-react";
import toast from "react-hot-toast";

function TeamsList() {
  const { teams, loading, fetchTeams, deleteTeam, error } = useOutsourceTeamStore();
  const { fetchTeamSettlements } = useSettlementStore();
  const [paymentStatuses, setPaymentStatuses] = useState<{
    [teamId: string]: string;
  }>({});

  useEffect(() => {
    fetchTeams().then(() => {
      teams.forEach(async (team: OutsourceTeam) => {
        if (team.id) {
          const settlements = await fetchTeamSettlements(team.id);
          const status = determinePaymentStatus(settlements);
          setPaymentStatuses((prev) => ({
            ...prev,
            [team.id as string]: status,
          }));
        }
      });
    });
  }, [teams]);


  const determinePaymentStatus = (settlements: Settlement[]): string => {
    if (settlements.length === 0) return "No payments";
    if (settlements.some((s) => s.status === "pending"))
      return "Pending payment";
    if (settlements.some((s) => s.status === "partial"))
      return "Partially paid";
    return "Completed payment";
  };

  if (loading)
    return (
      <div>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full size-6 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Outsource Teams</h1>
        <Link
          to="new"
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-black/80"
        >
          Add New Team
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-center">Name</th>
              <th className="px-6 py-3 text-center">GST</th>
              <th className="px-6 py-3 text-center">Contact Persons</th>
              <th className="px-6 py-3 text-center">Payment Status</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b text-center">
                <td className="px-6 py-4 ">{team.name}</td>
                <td className="px-6 py-4">{team.gst ? team.gst : "Not provided"}</td>
                <td className="px-6 py-4">
                  {team.contactPersons.map((person, index) => (
                    <div key={index}>
                      {person.name} - {person.phone}
                    </div>
                  ))}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 rounded-lg py-1 ${
                      paymentStatuses[team.id as string] === "Pending payment"
                        ? "bg-yellow-500"
                        : paymentStatuses[team.id as string] ===
                          "Partially paid"
                        ? "bg-orange-500"
                        : paymentStatuses[team.id as string] ===
                          "Completed payment"
                        ? "bg-green-500"
                        : "bg-gray-300"
                    } text-white`}
                  >
                    {paymentStatuses[team.id as string] || "Loading..."}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-3">
                    <Link
                      to={`${team.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={18} />
                    </Link>
                    <Link
                      to={`${team.id}/edit`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="text-green-600" size={18} />
                    </Link>
                    <button onClick={()=> deleteTeam(team.id as string)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Trash className="text-red-600" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OutsourceTeams() {
  return (
    <Routes>
      <Route path="/" element={<TeamsList />} />
      <Route path="/new" element={<NewTeam />} />
      <Route path="/:id" element={<TeamDetails />} />
      <Route path="/:id/edit" element={<EditTeam />} />
    </Routes>
  );
}
