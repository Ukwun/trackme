import type { ReactElement } from "react";
import { FaUserShield, FaBroadcastTower, FaHeadset, FaCarCrash, FaChartBar, FaUserSecret, FaTasks, FaMapMarkerAlt, FaRegFileAlt, FaCheckCircle, FaExclamationTriangle, FaSyncAlt } from "react-icons/fa";

export const roleIcons: Record<string, ReactElement> = {
  super_admin: <FaUserShield className="text-blue-800" />,
  control_room: <FaBroadcastTower className="text-purple-800" />,
  dispatcher: <FaHeadset className="text-green-800" />,
  patrol_officer: <FaCarCrash className="text-yellow-800" />,
  analyst: <FaChartBar className="text-pink-800" />,
  field_agent: <FaUserSecret className="text-blue-700" />,
};

export const widgetIcons = {
  assign: <FaTasks className="text-green-600" />,
  tasks: <FaTasks className="text-green-600" />,
  report: <FaRegFileAlt className="text-blue-600" />,
  export: <FaRegFileAlt className="text-pink-600" />,
  status: <FaCheckCircle className="text-yellow-600" />,
  incident: <FaExclamationTriangle className="text-red-600" />,
  location: <FaMapMarkerAlt className="text-blue-400" />,
  refresh: <FaSyncAlt className="text-gray-500" />,
};
