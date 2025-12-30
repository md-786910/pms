import React, { useEffect, useState } from "react";
import { useProject } from "../contexts/ProjectContext";
import { projectAPI } from "../utils/api";
import { useNotification } from "../contexts/NotificationContext";

const AdminTimeTracking = () => {
  const { projects, fetchProjects } = useProject();
  const { showToast } = useNotification();
  const [selectedProject, setSelectedProject] = useState(null);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projects || projects.length === 0) fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const resp = await projectAPI.getTimeTrackingReport(selectedProject._id);
      if (resp.data && resp.data.success) {
        setReport(resp.data.report || []);
      }
    } catch (err) {
      console.error("Fetch time tracking report error:", err);
      showToast("Failed to load time tracking report", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatSeconds = (sec) => {
    if (!sec || sec <= 0) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Time Tracking Report</h2>
          <div>
            <select
              className="border rounded-lg px-3 py-1"
              value={selectedProject?._id || ""}
              onChange={(e) => {
                const sel = projects.find((p) => p._id === e.target.value);
                setSelectedProject(sel);
              }}
            >
              <option value="">Select Project</option>
              {projects?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6">Loading...</div>
        ) : selectedProject ? (
          report.length === 0 ? (
            <div className="text-center py-6">No time tracking data for this project</div>
          ) : (
            <div className="space-y-4">
              {report.map((card) => (
                <div key={card.cardId} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{card.title} #{card.cardNumber}</div>
                      <div className="text-sm text-gray-500">Total: {formatSeconds(card.totalSeconds)}</div>
                    </div>
                    <div className="text-sm">
                      {card.perUser.length === 0 ? (
                        <div className="text-gray-500">No entries</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1">
                          {card.perUser.map((p) => (
                            <div key={p.user?._id || Math.random()} className="flex items-center gap-3">
                              <div className="font-medium">{p.user?.name || p.user?.email || "Unknown"}</div>
                              <div className="text-gray-600">{formatSeconds(p.totalSeconds)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-gray-500">Select a project to view the report</div>
        )}
      </div>
    </div>
  );
};

export default AdminTimeTracking;
