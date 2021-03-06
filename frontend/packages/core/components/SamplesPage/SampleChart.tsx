import React, {FunctionComponent, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ellipsis, em, primaryColor, size, textLightColor} from '~/utils/style';

import GridLoader from 'react-spinners/GridLoader';
import Image from '~/components/Image';
import StepSlider from '~/components/SamplesPage/StepSlider';
import isEmpty from 'lodash/isEmpty';
import queryString from 'query-string';
import styled from 'styled-components';
import {useRunningRequest} from '~/hooks/useRequest';
import {useTranslation} from '~/utils/i18n';

const width = em(430);
const height = em(384);

const Wrapper = styled.div`
    ${size(height, width)}
    padding: ${em(20)};
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;

    > * {
        flex-grow: 0;
        flex-shrink: 0;
    }
`;

const Title = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${em(20)};

    > h4 {
        font-size: ${em(16)};
        font-weight: 700;
        flex-shrink: 1;
        flex-grow: 1;
        padding: 0;
        margin: 0;
        ${ellipsis()}
    }

    > span {
        font-size: ${em(14)};
        flex-shrink: 0;
        flex-grow: 0;
        color: ${textLightColor};
    }
`;

const Container = styled.div<{fit?: boolean}>`
    flex-grow: 1;
    flex-shrink: 1;
    margin-top: ${em(20)};
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;

    > img {
        ${size('100%')}
        object-fit: ${props => (props.fit ? 'contain' : 'scale-down')};
        flex-shrink: 1;
    }
`;

type ImageData = {
    step: number;
    wallTime: number;
};

type SampleChartProps = {
    run: string;
    tag: string;
    fit?: boolean;
    running?: boolean;
};

const getImageUrl = (index: number, run: string, tag: string, wallTime: number): string =>
    `/images/image?${queryString.stringify({index, ts: wallTime, run, tag})}`;

const cacheValidity = 5 * 60 * 1000;

const SampleChart: FunctionComponent<SampleChartProps> = ({run, tag, fit, running}) => {
    const {t} = useTranslation('common');

    const {data, error, loading} = useRunningRequest<ImageData[]>(
        `/images/list?${queryString.stringify({run, tag})}`,
        !!running
    );

    const [step, setStep] = useState(0);
    const [src, setSrc] = useState<string>();

    const cached = useRef<Record<number, {src: string; timer: NodeJS.Timeout}>>({});
    const timer = useRef<NodeJS.Timeout | null>(null);

    // clear cache if tag or run changed
    useEffect(() => {
        Object.values(cached.current).forEach(({timer}) => clearTimeout(timer));
        cached.current = {};
    }, [tag, run]);

    const cacheImageSrc = useCallback(() => {
        if (!data) {
            return;
        }
        const imageUrl = getImageUrl(step, run, tag, data[step].wallTime);
        cached.current[step] = {
            src: imageUrl,
            timer: setTimeout(() => {
                ((s: number) => delete cached.current[s])(step);
            }, cacheValidity)
        };
        setSrc(imageUrl);
    }, [step, run, tag, data]);

    useEffect(() => {
        if (cached.current[step]) {
            // cached, return immediately
            setSrc(cached.current[step].src);
        } else if (isEmpty(cached.current)) {
            // first load, return immediately
            cacheImageSrc();
        } else {
            timer.current = setTimeout(cacheImageSrc, 500);
            return () => {
                timer.current && clearTimeout(timer.current);
            };
        }
    }, [step, cacheImageSrc]);

    const Content = useMemo(() => {
        // show loading when deferring
        if (loading || !cached.current[step]) {
            return <GridLoader color={primaryColor} size="10px" />;
        }
        if (!data && error) {
            return <span>{t('error')}</span>;
        }
        if (isEmpty(data)) {
            return <span>{t('empty')}</span>;
        }
        return <Image src={src} cache={cacheValidity} />;
    }, [loading, error, data, step, src, t]);

    return (
        <Wrapper>
            <Title>
                <h4>{tag}</h4>
                <span>{run}</span>
            </Title>
            <StepSlider
                value={step}
                steps={data?.map(item => item.step) ?? []}
                onChange={setStep}
                onChangeComplete={cacheImageSrc}
            />
            <Container fit={fit}>{Content}</Container>
        </Wrapper>
    );
};

export default SampleChart;
