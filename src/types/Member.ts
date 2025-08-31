// Member types
export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  cellId?: string;
  userId?: string;
  isActive: boolean;
  joinDate: Date;
  birthDate?: Date;
  occupation?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  cell?: {
    id: string;
    name: string;
    number?: string;
  };
  
  ministries?: {
    id: string;
    role: string;
    isActive: boolean;
    ministry: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  
  user?: {
    id: string;
    email: string;
    isActive: boolean;
  };
}

