// Status color utilities for consistent design across the application

// Project Status Colors
export const getProjectStatusColors = (status) => {
  const statusMap = {
    new: {
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      dotColor: "bg-blue-500",
      label: "New"
    },
    ongoing: {
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-200",
      dotColor: "bg-yellow-500",
      label: "Ongoing"
    },
    completed: {
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      dotColor: "bg-green-500",
      label: "Completed"
    },
    cancelled: {
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      dotColor: "bg-red-500",
      label: "Cancelled"
    }
  };

  return statusMap[status] || statusMap.new;
};

// Project Type Colors
export const getProjectTypeColors = (type) => {
  const typeMap = {
    maintenance: {
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
      dotColor: "bg-purple-500",
      label: "Maintenance"
    },
    ongoing: {
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700",
      borderColor: "border-indigo-200",
      dotColor: "bg-indigo-500",
      label: "Ongoing"
    },
    "one-time": {
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      borderColor: "border-orange-200",
      dotColor: "bg-orange-500",
      label: "One-time"
    }
  };

  return typeMap[type] || typeMap.maintenance;
};

// Card Status Colors (enhanced for better design)
export const getCardStatusColors = (status) => {
  const statusMap = {
    todo: {
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      dotColor: "bg-blue-500",
      label: "To Do"
    },
    doing: {
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-200",
      dotColor: "bg-yellow-500",
      label: "In Progress"
    },
    review: {
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
      dotColor: "bg-purple-500",
      label: "Review"
    },
    done: {
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      dotColor: "bg-green-500",
      label: "Done"
    }
  };

  return statusMap[status] || statusMap.todo;
};

// Priority Colors
export const getPriorityColors = (priority) => {
  const priorityMap = {
    low: {
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      dotColor: "bg-green-500",
      label: "Low"
    },
    medium: {
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-200",
      dotColor: "bg-yellow-500",
      label: "Medium"
    },
    high: {
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      borderColor: "border-orange-200",
      dotColor: "bg-orange-500",
      label: "High"
    },
    urgent: {
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      dotColor: "bg-red-500",
      label: "Urgent"
    }
  };

  return priorityMap[priority] || priorityMap.medium;
};

// Status Badge Component Helper
export const getStatusBadgeClasses = (type, status) => {
  const colors = type === 'projectStatus' ? getProjectStatusColors(status) : 
                 type === 'projectType' ? getProjectTypeColors(status) :
                 type === 'cardStatus' ? getCardStatusColors(status) :
                 getPriorityColors(status);
  
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bgColor} ${colors.textColor} ${colors.borderColor} border`;
};

// Status Dot Component Helper
export const getStatusDotClasses = (type, status) => {
  const colors = type === 'projectStatus' ? getProjectStatusColors(status) : 
                 type === 'projectType' ? getProjectTypeColors(status) :
                 type === 'cardStatus' ? getCardStatusColors(status) :
                 getPriorityColors(status);
  
  return `w-2 h-2 rounded-full ${colors.dotColor}`;
};
