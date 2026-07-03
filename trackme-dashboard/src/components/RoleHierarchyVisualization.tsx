/**
 * Role Hierarchy Tree Component
 * 
 * Visual representation of the organizational hierarchy with real-time updates
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  ROLE_HIERARCHY,
  type RoleName,
  getRoleInfo,
  getSuperiors,
  getAuthorityLevel,
} from '../api/roleHierarchy';

interface HierarchyMember {
  id: string;
  email: string;
  role: RoleName;
  status: 'online' | 'offline' | 'busy';
}

interface HierarchyData {
  [role: string]: HierarchyMember[];
}

interface Props {
  organizationalStructure?: HierarchyData;
  selectedRole?: RoleName;
  onRoleSelect?: (role: RoleName) => void;
  showRealTime?: boolean;
}

/**
 * Mermaid diagram for hierarchy visualization
 */
function generateHierarchyDiagram(): string {
  return `graph TD
    SA["👑 SUPER ADMIN<br/>Highest Authority<br/>System Oversight"]
    CRC["🏛️ CONTROL ROOM<br/>COMMANDER<br/>Tactical Command"]
    DIS["📡 DISPATCHER<br/>Dispatch Operations<br/>Unit Assignment"]
    FS["👷 FIELD SUPERVISOR<br/>Field Operations<br/>Team Coordination"]
    PO["🚗 PATROL OFFICER<br/>Field Response<br/>Task Execution"]
    FA["🔷 FIELD AGENT<br/>Field Operations<br/>Simple Tasks"]
    
    SA -->|manages| CRC
    CRC -->|manages| DIS
    DIS -->|manages| FS
    FS -->|manages| PO
    FS -->|manages| FA
    
    SA -.->|system oversight| DIS
    SA -.->|system oversight| FS
    SA -.->|system oversight| PO
    SA -.->|system oversight| FA
    
    CRC -.->|tactical oversight| FS
    CRC -.->|tactical oversight| PO
    DIS -.->|operational oversight| PO
    
    style SA fill:#3b82f6,stroke:#1e40af,color:#fff,stroke-width:3px
    style CRC fill:#a855f7,stroke:#6b21a8,color:#fff,stroke-width:2px
    style DIS fill:#22c55e,stroke:#15803d,color:#fff,stroke-width:2px
    style FS fill:#f59e0b,stroke:#b45309,color:#fff,stroke-width:2px
    style PO fill:#eab308,stroke:#a16207,color:#000,stroke-width:2px
    style FA fill:#06b6d4,stroke:#0369a1,color:#fff,stroke-width:2px`;
}

/**
 * Role card component
 */
function RoleCard({
  role,
  members,
  selected,
  onSelect,
}: {
  role: RoleName;
  members: HierarchyMember[];
  selected: boolean;
  onSelect?: () => void;
}) {
  const info = getRoleInfo(role);
  const superiors = getSuperiors(role);
  const level = getAuthorityLevel(role);

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg border-2 cursor-pointer transition-all
        ${
          selected
            ? `border-${info.color}-500 bg-${info.color}-50 shadow-lg`
            : `border-${info.color}-300 bg-white hover:border-${info.color}-400`
        }
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl">{info.icon}</span>
        <div>
          <h3 className="font-bold text-lg">{info.title}</h3>
          <p className="text-xs text-gray-500">Authority Level {level}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{info.description}</p>

      {/* Real-time member count */}
      <div className="mb-3 p-2 bg-gray-50 rounded">
        <div className="text-xs font-semibold text-gray-700 mb-2">
          {members.length} Member{members.length !== 1 ? 's' : ''}
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {members.map((member) => (
            <div key={member.id} className="text-xs flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  member.status === 'online'
                    ? 'bg-green-500'
                    : member.status === 'busy'
                      ? 'bg-yellow-500'
                      : 'bg-gray-300'
                }`}
              />
              <span className="text-gray-700">{member.email.split('@')[0]}</span>
              <span className="text-gray-400">({member.status})</span>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-xs text-gray-400 italic">No members assigned</div>
          )}
        </div>
      </div>

      {/* Reports to */}
      {superiors.length > 0 && (
        <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
          <span className="font-semibold">Reports to:</span>{' '}
          {superiors.map((s) => getRoleInfo(s as RoleName).title).join(', ')}
        </div>
      )}

      {/* Real-time capabilities */}
      <div className="text-xs text-gray-600 pt-2 border-t border-gray-200 mt-2">
        <span className="font-semibold block mb-1">Real-Time Capabilities:</span>
        <div className="flex flex-wrap gap-1">
          {info.realTimeCapabilities.slice(0, 3).map((cap) => (
            <span
              key={cap}
              className={`px-2 py-1 rounded text-white text-xs bg-${info.color}-500`}
            >
              {cap.split(':')[0]}
            </span>
          ))}
          {info.realTimeCapabilities.length > 3 && (
            <span className="px-2 py-1 rounded bg-gray-300 text-gray-700 text-xs">
              +{info.realTimeCapabilities.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main hierarchy component
 */
export default function RoleHierarchyVisualization({
  organizationalStructure = {},
  selectedRole,
  onRoleSelect,
  showRealTime = true,
}: Props) {
  const [hierarchy, setHierarchy] = useState<HierarchyData>(organizationalStructure);
  const [selected, setSelected] = useState<RoleName | undefined>(selectedRole);

  useEffect(() => {
    setHierarchy(organizationalStructure);
  }, [organizationalStructure]);

  const roles: RoleName[] = [
    'super_admin',
    'control_room_commander',
    'dispatcher',
    'field_supervisor',
    'patrol_officer',
    'field_agent',
  ];

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">🏛️ Role Hierarchy & Command Chain</h2>
        <p className="text-gray-600">Organizational structure with real-time team status</p>
      </div>

      {/* Hierarchy Diagram */}
      <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto border border-gray-200">
        <div className="min-w-full">
          <svg className="w-full" viewBox="0 0 800 600" style={{ minHeight: '600px' }}>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#666" />
              </marker>
            </defs>

            {/* Connections */}
            <line x1="400" y1="100" x2="400" y2="140" stroke="#666" strokeWidth="2" />
            <line x1="400" y1="140" x2="400" y2="180" stroke="#666" strokeWidth="2" />
            <line x1="400" y1="180" x2="400" y2="220" stroke="#666" strokeWidth="2" />

            {/* Role boxes (simplified text representation) */}
            <text x="50" y="50" fontSize="16" fontWeight="bold">
              👑 Super Admin
            </text>
            <text x="50" y="80" fontSize="14">
              Highest Authority
            </text>

            <text x="50" y="150" fontSize="16" fontWeight="bold">
              🏛️ Control Room Commander
            </text>
            <text x="50" y="180" fontSize="14">
              Tactical Command
            </text>

            <text x="50" y="250" fontSize="16" fontWeight="bold">
              📡 Dispatcher
            </text>
            <text x="50" y="280" fontSize="14">
              Dispatch Operations
            </text>

            <text x="50" y="350" fontSize="16" fontWeight="bold">
              👷 Field Supervisor
            </text>
            <text x="50" y="380" fontSize="14">
              Field Operations
            </text>

            <text x="50" y="450" fontSize="16" fontWeight="bold">
              🚗 Patrol Officer / 🔷 Field Agent
            </text>
            <text x="50" y="480" fontSize="14">
              Field Response & Task Execution
            </text>
          </svg>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <RoleCard
            key={role}
            role={role}
            members={hierarchy[role] || []}
            selected={selected === role}
            onSelect={() => {
              setSelected(role);
              onRoleSelect?.(role);
            }}
          />
        ))}
      </div>

      {/* Role Details Panel */}
      {selected && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{getRoleInfo(selected).icon}</span>
            <div>
              <h3 className="text-2xl font-bold">{getRoleInfo(selected).title}</h3>
              <p className="text-gray-600">{getRoleInfo(selected).description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Permissions */}
            <div>
              <h4 className="font-bold text-lg mb-3">Real-Time Capabilities</h4>
              <ul className="space-y-2">
                {getRoleInfo(selected).realTimeCapabilities.map((cap) => (
                  <li key={cap} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✓</span>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>

            {/* Hierarchy Info */}
            <div>
              <h4 className="font-bold text-lg mb-3">Authority & Relationships</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Authority Level</p>
                  <p className="text-lg font-bold">{getAuthorityLevel(selected)}</p>
                </div>

                {getRoleInfo(selected).managedBy.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 font-semibold mb-1">Reports to</p>
                    <div className="space-y-1">
                      {getRoleInfo(selected).managedBy.map((r) => (
                        <p key={r} className="text-sm">
                          {getRoleInfo(r as RoleName).icon} {getRoleInfo(r as RoleName).title}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {getRoleInfo(selected).canManage.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 font-semibold mb-1">Manages</p>
                    <div className="space-y-1">
                      {getRoleInfo(selected).canManage.map((r) => (
                        <p key={r} className="text-sm">
                          {getRoleInfo(r as RoleName).icon} {getRoleInfo(r as RoleName).title}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Operational Domain */}
          <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-gray-600 font-semibold mb-1">Operational Domain</p>
            <p className="text-lg font-bold text-blue-900">{getRoleInfo(selected).operationalDomain}</p>
          </div>
        </div>
      )}

      {/* Real-Time Indicator */}
      {showRealTime && (
        <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700">
            Real-time synchronization active • Updates broadcast across all connected clients
          </span>
        </div>
      )}
    </div>
  );
}
