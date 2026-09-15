export interface TicketUser {
  userid: string;
  username: string | null;
  firstname: string;
  lastname: string;
  email?: string | null;
}

export interface TicketComment {
  id: string;
  comment: string;
  createdAt: Date;
  user: {
    userid: string;
    username: string | null;
    firstname: string;
    lastname: string;
  };
}

export interface TicketAdminUser {
  userid: string;
  username: string | null;
  firstname: string;
  lastname: string;
}

export interface TicketDepartment {
  id: string;
  name: string;
}

export interface TicketAsset {
  assetid: string;
  assetname: string;
  assettag: string;
}

export interface TicketActor {
  id: string;
  role: "requester" | "observer" | "assignee" | string;
  userId: string | null;
  departmentId: string | null;
  user: TicketUser | null;
  department: TicketDepartment | null;
}

export interface TicketTask {
  id: string;
  content: string;
  state: string;
  assignedTo: string | null;
  actionMinutes: number | null;
  begin: Date | null;
  end: Date | null;
  createdAt: Date;
  creator: TicketUser;
  assignee: TicketUser | null;
}

export interface TicketValidation {
  id: string;
  requestedBy: string;
  targetUserId: string;
  commentSubmission: string | null;
  commentValidation: string | null;
  status: string;
  createdAt: Date;
  decidedAt: Date | null;
  requester: TicketUser;
  target: TicketUser;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string | null;
  type: string;
  category: string | null;
  status: string;
  priority: string;
  urgency: number;
  impact: number;
  createdBy: string;
  assignedTo: string | null;
  assetId: string | null;
  solution: string | null;
  solutionStatus: string;
  globalValidation: string;
  solvedAt: Date | null;
  solvedBy: string | null;
  timeToOwn: Date | null;
  timeToResolve: Date | null;
  slaPausedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  creator: TicketUser;
  assignee: TicketUser | null;
  solver: TicketUser | null;
  asset: TicketAsset | null;
  comments: TicketComment[];
  actors: TicketActor[];
  tasks: TicketTask[];
  validations: TicketValidation[];
}
