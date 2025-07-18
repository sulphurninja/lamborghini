'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [newExpiry, setNewExpiry] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    isAdmin: false
  });
  const [loading, setLoading] = useState(false);
  // Add state for managing expanded user rows to show devices
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password) {
      console.error('Username and password required');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subs_credentials: {
            user_name: newUser.username,
            password: newUser.password
          },
          isAdmin: newUser.isAdmin
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchUsers();
      setNewUser({ username: '', password: '', isAdmin: false });
      console.log('User created successfully');
    } catch (error) {
      console.error(error.message || 'Failed to create user');
    }
  };

  const updateExpiry = async (userId: string) => {
    if (!newExpiry) {
      console.error('Please select a date');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiry: new Date(newExpiry) })
      });

      if (!res.ok) throw new Error('Update failed');

      await fetchUsers();
      setNewExpiry('');
      console.log('Expiry updated successfully');
    } catch (error) {
      console.error('Failed to update expiry');
    }
  };

  // Add a function to remove a device

  const removeDevice = async (userId, deviceIndex) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}?deviceIndex=${deviceIndex}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error(`Failed to remove device: ${res.status}`, errorData);
        throw new Error(`Failed to remove device: ${res.status}`);
      }

      await fetchUsers();
      console.log('Device removed successfully');
    } catch (error) {
      console.error('Failed to remove device:', error);
    }
  };


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Create User Section */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Create New User</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Username *</label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newUser.isAdmin}
                onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium">Admin User</label>
            </div>
            <button
              onClick={createUser}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Create User
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan Expiry</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devices</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : users?.map(user => (
              <>
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isAdmin ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.plan_expiry ? (
                      <span className={new Date(user.plan_expiry) > new Date() ?
                        'text-green-600' : 'text-red-600'}>
                        {format(new Date(user.plan_expiry), 'dd MMM yyyy')}
                      </span>
                    ) : (
                      <span className="text-gray-400">No subscription</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      {user.devices?.length || 0} Devices
                      {expandedUser === user._id ? ' ▲' : ' ▼'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={newExpiry}
                        onChange={(e) => setNewExpiry(e.target.value)}
                        className="border rounded p-1 text-sm"
                      />
                      <button
                        onClick={() => updateExpiry(user._id)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedUser === user._id && user.devices?.length > 0 && (
                  <tr key={`${user._id}-devices`}>
                    <td colSpan={5} className="px-6 py-4 bg-gray-50">
                      <div className="text-sm">
                        <h4 className="font-medium mb-2">Devices:</h4>
                        <ul className="space-y-2">
                          {user.devices.map((device, index) => (
                            <li key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                              <span className="font-mono text-xs">{device}</span>
                              <button
                                onClick={() => removeDevice(user._id, index)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Remove device"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
