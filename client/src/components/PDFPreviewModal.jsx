import React, { useState } from "react";
import {
  formatDate,
  getEndDate,
  getWeeklyAmount,
  calculateWeeksSinceJoin,
  generateMembersWeekPDF,
} from "../utils/pdfGenerator";

const PDFPreviewModal = ({ isOpen, onClose, users = [], title = "Raghuram Finance - Member Weeks Report" }) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filteredList = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.memberName?.toLowerCase().includes(term) ||
      u.phoneNumber?.includes(term) ||
      u.aadharNumber?.includes(term)
    );
  });

  const currentDateStr = formatDate(new Date());

  // Sort: red rows (>=12 weeks) first, then descending weeks
  const sortedList = [...filteredList].sort((a, b) => {
    const weeksA = calculateWeeksSinceJoin(a.startDate);
    const weeksB = calculateWeeksSinceJoin(b.startDate);
    const aRed = weeksA >= 12;
    const bRed = weeksB >= 12;
    if (aRed && !bRed) return -1;
    if (!aRed && bRed) return 1;
    return weeksB - weeksA; // descending weeks
  });

  const totalWeeklyAmount = sortedList.reduce((sum, user) => sum + getWeeklyAmount(user), 0);

  const handleDownload = () => {
    generateMembersWeekPDF(filteredList, title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📄</span>
            <div>
              <h2 className="text-2xl font-bold">{title} - Preview</h2>
              <p className="text-emerald-100 text-sm mt-0.5">
                Current Date: <span className="font-semibold text-white">{currentDateStr}</span> | Total Members: <span className="font-semibold text-white">{filteredList.length}</span> | Total Weekly Amount: <span className="font-bold text-emerald-200">₹{totalWeeklyAmount.toLocaleString("en-IN")}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-xl font-bold cursor-pointer"
            title="Close popup"
          >
            ✕
          </button>
        </div>

        {/* Search & Quick Stats Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search in preview..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredList.length}</span> of {users.length} members
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-6">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <span className="text-4xl block mb-2">🔍</span>
              No members found matching your search.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-emerald-600 text-white font-semibold">
                    <th className="px-3 py-3 text-center">#</th>
                    <th className="px-4 py-3">Member Name</th>
                    <th className="px-3 py-3 text-center">Start Date</th>
                    <th className="px-3 py-3 text-center">End Date</th>
                    <th className="px-3 py-3 text-center">Current Date</th>
                    <th className="px-3 py-3 text-center">Weeks Since Joined</th>
                    <th className="px-3 py-3 text-center">Paid / Total</th>
                    <th className="px-3 py-3 text-center">Paid</th>
                    <th className="px-3 py-3 text-center">Pending</th>
                    <th className="px-4 py-3 text-right">Chit Amount</th>
                    <th className="px-4 py-3 text-right">Weekly Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {sortedList.map((user, index) => {
                    const weeksSinceJoin = calculateWeeksSinceJoin(user.startDate);
                    const weeklyAmt = getWeeklyAmount(user);
                    const paidWeeks =
                      user.completedMonths !== undefined
                        ? user.completedMonths
                        : user.paymentRecords?.filter((r) => r.status === "paid" || r.status === "partial").length || 0;
                    const totalWeeks = user.tenure || 0;
                    const pendingWeeks = Math.max(0, totalWeeks - paidWeeks);
                    return (
                      <tr key={user._id || index} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="px-3 py-2.5 text-center text-gray-500 font-medium">{index + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-900">{user.memberName || "N/A"}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">{formatDate(user.startDate)}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">{getEndDate(user)}</td>
                        <td className="px-3 py-2.5 text-center text-gray-500 whitespace-nowrap">{currentDateStr}</td>
                        <td className={`px-3 py-2.5 text-center font-bold whitespace-nowrap transition-colors ${weeksSinceJoin >= 12 ? "bg-red-600 text-white font-extrabold shadow-inner" : "text-emerald-700 bg-emerald-50/50"}`}>
                          {weeksSinceJoin} {weeksSinceJoin === 1 ? "week" : "weeks"}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-700 whitespace-nowrap">{paidWeeks} / {totalWeeks}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-emerald-600">{paidWeeks}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-red-500">{pendingWeeks}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-800 whitespace-nowrap">
                          {user.chitAmount ? `₹${Number(user.chitAmount).toLocaleString("en-IN")}` : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700 bg-emerald-50/30 whitespace-nowrap">
                          {weeklyAmt ? `₹${weeklyAmt.toLocaleString("en-IN")}` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-emerald-50 font-bold border-t-2 border-emerald-200">
                  <tr>
                    <td colSpan="10" className="px-4 py-3 text-right text-gray-800 text-sm">
                      Total Weekly Amount ({sortedList.length} Members):
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-800 text-sm sm:text-base font-extrabold whitespace-nowrap bg-emerald-100/70">
                      ₹{totalWeeklyAmount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 border-2 border-emerald-400 rounded-2xl px-5 py-2.5 text-emerald-950 flex items-center space-x-3 shadow-sm">
              <span className="text-2xl">💰</span>
              <div>
                <span className="text-xs uppercase font-extrabold text-emerald-800 tracking-wide block">Total Weekly Amount</span>
                <span className="text-xl font-black text-emerald-950">₹{totalWeeklyAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-blue-900 flex items-center space-x-2">
              <span className="text-xl">👥</span>
              <div>
                <span className="text-xs uppercase font-bold text-blue-700 block">Total Members</span>
                <span className="text-lg font-extrabold text-blue-900">{sortedList.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-100 transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={handleDownload} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 cursor-pointer group">
              <span className="text-xl group-hover:scale-110 transition-transform">📥</span>
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewModal;
