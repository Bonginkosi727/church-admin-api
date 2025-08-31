// Member repository interface
import { Member } from '../domains/members/Member';

export interface MemberRepository {
  findAll(): Promise<Member[]>;
  findById(id: string): Promise<Member | null>;
  create(member: Member): Promise<Member>;
  update(id: string, member: Partial<Member>): Promise<Member>;
  delete(id: string): Promise<void>;
}

