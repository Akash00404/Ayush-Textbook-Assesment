import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

enum UserRole {
  ADMIN = "ADMIN",
  SECRETARIAT = "SECRETARIAT",
  REVIEWER = "REVIEWER",
  COMMITTEE = "COMMITTEE"
}

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const auditLogger = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Store the original end method
  const originalEnd = res.end;

  // Override the end method
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    // Call the original end method
    originalEnd.call(this, chunk, encoding, callback);

    // Skip audit logging for certain paths
    if (req.path.startsWith('/api/audit') || req.method === 'OPTIONS') {
      return res;
    }

    // Get user ID from JWT token (set by auth middleware)
    const userId = req.user?.id || 'anonymous';

    // Determine action based on HTTP method and path
    let action = `${req.method}_${req.path}`;
    let targetType = '';
    let targetId = '';

    // Extract target type and ID from path
    const pathParts = req.path.split('/');
    if (pathParts.length >= 3) {
      targetType = pathParts[2]; // e.g., 'books', 'assignments'
      if (pathParts.length >= 4 && pathParts[3]) {
        targetId = pathParts[3]; // e.g., book ID, assignment ID
      }
    }

    // Create audit log entry
    if (userId !== 'anonymous') {
      try {
        prisma.auditLog.create({
          data: {
            actor_id: userId,
            action,
            target_type: targetType,
            target_id: targetId || 'none',
            details: JSON.stringify({
              method: req.method,
              path: req.path,
              query: req.query,
              body: req.body,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString(),
            }),
          },
        }).catch((err: any) => {
          console.error('Error creating audit log:', err);
        });
      } catch (error) {
        console.error('Error in audit logging:', error);
      }
    }

    return res;
  };

  next();
};