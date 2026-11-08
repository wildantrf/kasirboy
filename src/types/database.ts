export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      create_business_with_branch: {
        Args: {
          business_name: string;
          branch_name: string;
          branch_address?: string;
          branch_timezone?: string;
        };
        Returns: Array<{ business_id: string; branch_id: string }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
