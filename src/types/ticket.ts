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

export interface TicketAsset {
  assetid: string;
  assetname: string;
  assettag: string;
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
  createdBy: string;
  assignedTo: string | null;
  assetId: string | null;
  solution: string | null;
  solvedAt: Date | null;
  solvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  creator: TicketUser;
  assignee: TicketUser | null;
  solver: TicketUser | null;
  asset: TicketAsset | null;
  comments: TicketComment[];
}
