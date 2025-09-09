import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

// Get audit logs with pagination and filtering
export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Extract filter parameters
    const { actor_id, action, target_type, target_id, from_date, to_date } = req.query;

    // Build filter object
    const filter: any = {};

    if (actor_id) filter.actor_id = actor_id as string;
    if (action) filter.action = action as string;
    if (target_type) filter.target_type = target_type as string;
    if (target_id) filter.target_id = target_id as string;

    // Date range filter
    if (from_date || to_date) {
      filter.timestamp = {};
      if (from_date) filter.timestamp.gte = new Date(from_date as string);
      if (to_date) filter.timestamp.lte = new Date(to_date as string);
    }

    // Get total count for pagination
    const total = await prisma.auditLog.count({
      where: filter,
    });

    // Get audit logs with pagination and sorting
    const auditLogs = await prisma.auditLog.findMany({
      where: filter,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      skip,
      take: limit,
    });

    return res.status(200).json({
      status: 'success',
      results: auditLogs.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      data: {
        auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};