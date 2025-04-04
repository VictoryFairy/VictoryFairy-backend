import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';

export class RequestMetaMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const xff = req.headers['x-forwarded-for'];

    const ip =
      (Array.isArray(xff) ? xff[0] : xff?.split(',')[0]?.trim()) ||
      req.socket.remoteAddress ||
      null;

    const rawUserAgent = req.get('user-agent')?.trim() || null;

    if (!rawUserAgent || !ip) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { browser, os, device } = UAParser(rawUserAgent);
    const userAgent = `${browser.name} ${browser.version} / ${os.name} ${os.version} / ${device.type ?? 'Desktop'}`;

    req.extractedIp = ip;
    req.userAgent = userAgent;

    next();
  }
}
