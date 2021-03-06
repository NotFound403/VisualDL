import React, {FunctionComponent, useLayoutEffect, useState} from 'react';

import GridLoader from 'react-spinners/GridLoader';
import {blobFetcher} from '~/utils/fetch';
import {primaryColor} from '~/utils/style';
import useRequest from '~/hooks/useRequest';
import {useTranslation} from '~/utils/i18n';

type ImageProps = {
    src?: string;
    cache?: number;
};

const Image: FunctionComponent<ImageProps> = ({src, cache}) => {
    const {t} = useTranslation('common');

    const [url, setUrl] = useState('');

    const {data, error, loading} = useRequest<Blob>(src ?? null, blobFetcher, {
        dedupingInterval: cache ?? 2000
    });

    // use useLayoutEffect hook to prevent image render after url revoked
    useLayoutEffect(() => {
        if (process.browser && data) {
            let objectUrl: string | null = null;
            objectUrl = URL.createObjectURL(data);
            setUrl(objectUrl);
            return () => {
                objectUrl && URL.revokeObjectURL(objectUrl);
            };
        }
    }, [data]);

    if (loading) {
        return <GridLoader color={primaryColor} size="10px" />;
    }

    if (error) {
        return <div>{t('error')}</div>;
    }

    return <img src={url} />;
};

export default Image;
