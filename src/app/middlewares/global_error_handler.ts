import { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import handleZodError from '../errors/zodError'
import handleValidationError from '../errors/validationError'
import handleCastError from '../errors/castError'
import { TErrorSources } from '../types/error'
import handleDuplicateError from '../errors/duplicateError'
import { AppError } from '../utils/app_error'
import { configs } from '../configs'
import logger from '../configs/logger'

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    let statusCode = 500
    let message = 'Something went wrong!'
    let errorSources: TErrorSources = [
        {
            path: '',
            message: 'Something went wrong'
        }
    ]

    // Log error for debugging
    logger.error('Error:', {
        message: err?.message,
        stack: err?.stack,
        path: req?.path,
        method: req?.method
    });

    if (err instanceof ZodError) {
        const simplifiedError = handleZodError(err)
        statusCode = simplifiedError?.statusCode
        message = simplifiedError?.message
        errorSources = simplifiedError?.errorSources
    } else if (err?.name === 'ValidationError') {
        const simplifiedError = handleValidationError(err)
        statusCode = simplifiedError?.statusCode
        message = simplifiedError?.message
        errorSources = simplifiedError?.errorSources
    } else if (err?.name === 'CastError') {
        const simplifiedError = handleCastError(err)
        statusCode = simplifiedError?.statusCode
        message = simplifiedError?.message
        errorSources = simplifiedError?.errorSources
    } else if (err?.code === 11000) {
        const simplifiedError = handleDuplicateError(err)
        statusCode = simplifiedError?.statusCode
        message = simplifiedError?.message
        errorSources = simplifiedError?.errorSources
    } else if (err instanceof AppError) {
        statusCode = err?.statusCode
        message = err.message
        errorSources = [
            {
                path: '',
                message: err?.message
            }
        ]
    } else if (err instanceof Error) {
        message = err.message
        errorSources = [
            {
                path: '',
                message: err?.message
            }
        ]
    }

    const responseBody: Record<string, unknown> = {
        success: false,
        message,
        errorSources,
        stack: configs.env === 'development' ? err?.stack : null,
    };

    if (err instanceof AppError && err.details) {
        responseBody.data = err.details;
        Object.assign(responseBody, err.details);
    }

    res.status(statusCode).json(responseBody);
}

export default globalErrorHandler