import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to format date strictly as Date-Month-Year (DD-MM-YYYY)
export const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Calculate end date if not present
export const getEndDate = (user) => {
  if (user.endDate) return formatDate(user.endDate);
  if (user.startDate && user.tenure) {
    const start = new Date(user.startDate);
    const end = new Date(start);
    if (user.tenureType === "month") {
      end.setMonth(end.getMonth() + parseInt(user.tenure));
    } else {
      end.setDate(end.getDate() + parseInt(user.tenure) * 7);
    }
    return formatDate(end);
  }
  return "-";
};

// Helper to get weekly installment amount
export const getWeeklyAmount = (user) => {
  if (user.monthlyPremium) return Number(user.monthlyPremium);
  if (user.chitAmount && user.tenure) {
    return Math.round(Number(user.chitAmount) / Number(user.tenure));
  }
  return 0;
};

// Calculate how many weeks have passed since join date (startDate)
export const calculateWeeksSinceJoin = (startDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 0;

  const now = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (currentDay < startDay) return 0;

  const diffTime = currentDay.getTime() - startDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  return diffWeeks;
};

export const generateMembersWeekPDF = (users = [], title = "Chit Fund - Member Weeks Report") => {
  if (!users || users.length === 0) {
    alert("No member data available to generate PDF.");
    return;
  }

  // Use landscape for optimal space for all columns
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width; // 297mm
  const pageHeight = doc.internal.pageSize.height; // 210mm
  const now = new Date();
  const currentDateStr = formatDate(now);

  // Calculate total weekly amount only (as requested)
  const totalWeeklyAmount = users.reduce(
    (sum, user) => sum + getWeeklyAmount(user),
    0
  );

  // Header banner styling
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  doc.text(
    `Current Date: ${currentDateStr} | Time: ${timeStr} | Total Members: ${users.length} | Total Weekly Amount: Rs. ${totalWeeklyAmount.toLocaleString("en-IN")}`,
    14,
    20
  );

  // Prepare table data:
  // Replaced Status column with Weekly Amount
  const tableRows = users.map((user, index) => {
    const weeksSinceJoin = calculateWeeksSinceJoin(user.startDate);
    const startDateFormatted = formatDate(user.startDate);
    const endDateFormatted = getEndDate(user);
    const weeklyAmount = getWeeklyAmount(user);

    const paidWeeks =
      user.completedMonths !== undefined
        ? user.completedMonths
        : user.paymentRecords?.filter(
            (r) => r.status === "paid" || r.status === "partial"
          ).length || 0;

    const totalWeeks = user.tenure || 0;
    const pendingWeeks = Math.max(0, totalWeeks - paidWeeks);

    return [
      index + 1,
      user.memberName || "N/A",
      startDateFormatted,
      endDateFormatted,
      currentDateStr,
      `${weeksSinceJoin} ${weeksSinceJoin === 1 ? "week" : "weeks"}`,
      `${paidWeeks} / ${totalWeeks}`,
      paidWeeks,
      pendingWeeks,
      user.chitAmount ? `Rs. ${Number(user.chitAmount).toLocaleString("en-IN")}` : "-",
      weeklyAmount ? `Rs. ${weeklyAmount.toLocaleString("en-IN")}` : "-",
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [
      [
        "#",
        "Member Name",
        "Start Date",
        "End Date",
        "Current Date",
        "Weeks Since Joined",
        "Paid / Total",
        "Paid",
        "Pending",
        "Chit Amount",
        "Weekly Amount",
      ],
    ],
    body: tableRows,
    foot: [
      [
        {
          content: `TOTAL WEEKLY AMOUNT (${users.length} Members)`,
          colSpan: 10,
          styles: {
            halign: "right",
            fontStyle: "bold",
            fillColor: [243, 244, 246],
            textColor: [17, 24, 39],
            fontSize: 10,
          },
        },
        {
          content: `Rs. ${totalWeeklyAmount.toLocaleString("en-IN")}`,
          styles: {
            halign: "right",
            fontStyle: "bold",
            fillColor: [209, 250, 229], // emerald-100
            textColor: [4, 120, 87], // emerald-700
            fontSize: 10.5,
          },
        },
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [31, 41, 55],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", fontStyle: "bold", cellWidth: 45 },
      2: { halign: "center", cellWidth: 23 }, // Start Date
      3: { halign: "center", cellWidth: 23 }, // End Date
      4: { halign: "center", cellWidth: 23 }, // Current Date
      5: { halign: "center", fontStyle: "bold", textColor: [5, 150, 105], cellWidth: 30 }, // Weeks Since Joined
      6: { halign: "center", cellWidth: 25 }, // Paid / Total
      7: { halign: "center", cellWidth: 16 }, // Paid
      8: { halign: "center", cellWidth: 16 }, // Pending
      9: { halign: "right", cellWidth: 30 }, // Chit Amount
      10: { halign: "right", fontStyle: "bold", textColor: [4, 120, 87], cellWidth: 28 }, // Weekly Amount
    },
    alternateRowStyles: {
      fillColor: [243, 244, 246],
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    },
  });

  const fileName = `members_week_report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};
