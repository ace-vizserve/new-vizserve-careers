export type Approver = {
  email: string;
  displayName: string;
};

export type ApprovalStage = {
  id: string;
  approvers: Approver[];
};

export type GraphUser = {
  id: string;
  displayName: string;
  email: string;
};
