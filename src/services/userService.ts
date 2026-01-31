import { User } from '@/contexts/AuthContext';

// In-memory user storage (in production, this would be a database)
let users: User[] = [
  { 
    email: 'admin@footbrain.com', 
    name: 'Admin', 
    role: 'admin' 
  },
  { 
    email: 'user1@example.com', 
    name: 'John Doe', 
    role: 'user',
    teamInfo: {
      name: 'Manchester United',
      totalPlayers: 28,
      injuryAlerts: 3,
      marketValue: '€450M',
      videosAnalyzed: 12
    }
  },
  { 
    email: 'user2@example.com', 
    name: 'Jane Smith', 
    role: 'user',
    teamInfo: {
      name: 'Liverpool FC',
      totalPlayers: 25,
      injuryAlerts: 2,
      marketValue: '€520M',
      videosAnalyzed: 18
    }
  },
  {
    email: 'user3@example.com',
    name: 'Mike Johnson',
    role: 'user',
    teamInfo: {
      name: 'Arsenal FC',
      totalPlayers: 30,
      injuryAlerts: 1,
      marketValue: '€380M',
      videosAnalyzed: 15
    }
  },
  {
    email: 'user4@example.com',
    name: 'Sarah Williams',
    role: 'user',
    teamInfo: {
      name: 'Chelsea FC',
      totalPlayers: 27,
      injuryAlerts: 4,
      marketValue: '€410M',
      videosAnalyzed: 9
    }
  },
];

// Load users from localStorage on initialization
const loadUsers = () => {
  try {
    const stored = localStorage.getItem('users');
    if (stored) {
      users = JSON.parse(stored);
    } else {
      // Initialize with default users
      localStorage.setItem('users', JSON.stringify(users));
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

// Save users to localStorage
const saveUsers = () => {
  try {
    localStorage.setItem('users', JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
  }
};

// Initialize on module load
loadUsers();

export const getAllUsers = (): User[] => {
  return [...users];
};

export const getUserByEmail = (email: string): User | undefined => {
  return users.find(u => u.email === email);
};

export const addUser = (user: Omit<User, 'email'> & { email: string }): User => {
  // Check if user already exists
  if (users.find(u => u.email === user.email)) {
    throw new Error('User with this email already exists');
  }
  
  const newUser: User = {
    email: user.email,
    name: user.name,
    role: user.role || 'user',
    teamInfo: user.teamInfo || {
      name: `${user.name}'s Team`,
      totalPlayers: 0,
      injuryAlerts: 0,
      marketValue: '€0M',
      videosAnalyzed: 0
    },
  };
  
  users.push(newUser);
  saveUsers();
  return newUser;
};

export const updateUser = (email: string, updates: Partial<Omit<User, 'email'>>): User => {
  const userIndex = users.findIndex(u => u.email === email);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // Prevent changing admin email
  if (email === 'admin@footbrain.com' && updates.email && updates.email !== email) {
    throw new Error('Cannot change admin email');
  }
  
  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    email, // Keep original email
  };
  
  saveUsers();
  return users[userIndex];
};

export const deleteUser = (email: string): void => {
  // Prevent deleting admin
  if (email === 'admin@footbrain.com') {
    throw new Error('Cannot delete admin user');
  }
  
  const userIndex = users.findIndex(u => u.email === email);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  users.splice(userIndex, 1);
  saveUsers();
};
